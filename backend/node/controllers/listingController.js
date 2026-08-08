import asyncHandler from 'express-async-handler';
import Listing from '../models/Listing.js';
import { uploadToCloudinary } from '../services/uploadService.js';
import { analyzeCropImage } from '../services/aiService.js';
import FormDataNode from 'form-data';
import fetch from 'node-fetch';

// @desc    Create a new listing (farmer only)
// @route   POST /api/listings
// @access  Private (farmer)
export const createListing = asyncHandler(async (req, res) => {
  const { cropName, variety, quantity, unit, pricePerUnit, description, isOrganic, premiumVerified } = req.body;
  // images are uploaded via multipart/form-data; expecting field "images" array
  const imageFiles = req.files || [];
  const uploadResults = await Promise.all(imageFiles.map(f => uploadToCloudinary(f.buffer, f.originalname)));
  const images = uploadResults.map(r => ({ url: r.secure_url, public_id: r.public_id }));

  // Parse location correctly from nested object or form fields
  let locationData = {};
  if (req.body.location) {
    if (typeof req.body.location === 'string') {
      try {
        locationData = JSON.parse(req.body.location);
      } catch (err) {
        locationData = { address: req.body.location };
      }
    } else {
      locationData = req.body.location;
    }
  } else if (req.body['location[address]']) {
    locationData = {
      address: req.body['location[address]'],
      district: req.body['location[district]'] || '',
      state: req.body['location[state]'] || '',
      lat: req.body['location[lat]'] ? Number(req.body['location[lat]']) : undefined,
      lng: req.body['location[lng]'] ? Number(req.body['location[lng]']) : undefined,
    };
  }

  // Optional AI verification: if client sent a flag or pre-analyzed report
  let aiVerified = false;
  let verificationReport = {};
  if (req.body.aiVerify === 'true') {
    if (req.body.verificationReport) {
      try {
        const parsedReport = JSON.parse(req.body.verificationReport);
        aiVerified = true;
        // Map report fields to the mongoose schema
        verificationReport = {
          confidenceScore: parsedReport.confidence || 95,
          healthScore: parsedReport.report?.freshnessIndex ? parseInt(parsedReport.report.freshnessIndex) || 90 : 90,
          diseaseSigns: parsedReport.report?.pestIssues && parsedReport.report.pestIssues !== 'None detected' ? [parsedReport.report.pestIssues] : [],
          pestDetection: parsedReport.report?.pestIssues && parsedReport.report.pestIssues !== 'None detected',
          estimatedPrice: parsedReport.report?.estimatedPrice ? Number(parsedReport.report.estimatedPrice) : undefined,
          storageRecommendation: parsedReport.report?.storageRecommendation || 'Store in dry place',
          qualityGrade: parsedReport.report?.condition || 'A',
          overallAssessment: parsedReport.report?.overallAssessment || parsedReport.message || 'Verified by AI crop scanning.',
        };
      } catch (err) {
        console.error('Failed to parse verificationReport from body:', err);
      }
    }

    if (!aiVerified && req.files && req.files.length > 0) {
      try {
        const analysis = await analyzeCropImage(req.files[0].buffer, req.files[0].mimetype);
        aiVerified = true;
        verificationReport = analysis;
      } catch (err) {
        console.error('AI analysis failed in controller:', err);
      }
    }
  }

  const listing = await Listing.create({
    farmer: req.user.id,
    cropName,
    variety,
    quantity,
    unit,
    pricePerUnit,
    description,
    images,
    isOrganic: isOrganic === 'true',
    location: locationData,
    premiumVerified: premiumVerified === 'true' || premiumVerified === true,
    aiVerified,
    verificationReport,
    // Initialise verification sub-doc in pending state
    verification: { status: 'pending_review' },
  });

  // ── Fire-and-forget: trigger CropVerify AI pipeline asynchronously ─────────
  // We don't await so the farmer gets an instant 201 response.
  // The FastAPI service updates MongoDB directly when done.
  if (req.files && req.files.length > 0) {
    const CROPVERIFY_URL = process.env.CROPVERIFY_SERVICE_URL || 'http://127.0.0.1:5002';
    const formPayload = new FormDataNode();
    formPayload.append('image', req.files[0].buffer, {
      filename: req.files[0].originalname || 'image.jpg',
      contentType: req.files[0].mimetype || 'image/jpeg',
    });
    formPayload.append('listing_id', listing._id.toString());
    formPayload.append('farmer_id',  req.user.id.toString());
    formPayload.append('crop_name',  cropName || 'Unknown');
    if (locationData.lat) formPayload.append('lat', String(locationData.lat));
    if (locationData.lng) formPayload.append('lon', String(locationData.lng));

    fetch(`${CROPVERIFY_URL}/verify/upload-product`, {
      method: 'POST',
      body: formPayload,
      headers: formPayload.getHeaders(),
    }).then(r => {
      if (!r.ok) r.json().then(e => console.error('[CropVerify] Pipeline error:', e.detail || e));
      else r.json().then(d => console.log('[CropVerify] Completed listing=%s status=%s', listing._id, d?.verification?.status));
    }).catch(err => {
      console.warn('[CropVerify] FastAPI service unavailable (start verification/main.py on port 5002):', err.message);
    });
  }

  res.status(201).json(listing);
});

// @desc    Get listings with filters, pagination, sorting
// @route   GET /api/listings
// @access  Public
export const getListings = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 12;
  const sortBy = req.query.sortBy || 'createdAt';
  const order = req.query.order === 'desc' ? -1 : 1;

  const filter = {};
  if (req.query.crop) filter.cropName = { $regex: req.query.crop, $options: 'i' };
  if (req.query.location) filter['location.state'] = { $regex: req.query.location, $options: 'i' };
  if (req.query.minPrice) filter.pricePerUnit = { ...filter.pricePerUnit, $gte: Number(req.query.minPrice) };
  if (req.query.maxPrice) filter.pricePerUnit = { ...filter.pricePerUnit, $lte: Number(req.query.maxPrice) };
  if (req.query.organic) filter.isOrganic = req.query.organic === 'true';

  const total = await Listing.countDocuments(filter);
  const listings = await Listing.find(filter)
    .sort({ [sortBy]: order })
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('farmer', 'name avatar location');

  res.json({ total, page, pages: Math.ceil(total / limit), listings });
});

// @desc    Get a single listing by ID
// @route   GET /api/listings/:id
// @access  Public
export const getListingById = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate('farmer', 'name avatar location');
  if (!listing) {
    return res.status(404).json({ message: 'Listing not found' });
  }
  // increment view counter
  listing.views += 1;
  await listing.save();
  res.json(listing);
});

// @desc    Update a listing (farmer only)
// @route   PUT /api/listings/:id
// @access  Private (farmer)
export const updateListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    return res.status(404).json({ message: 'Listing not found' });
  }
  if (listing.farmer.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  const updates = req.body;
  // handle optional new images
  if (req.files && req.files.length > 0) {
    const uploadResults = await Promise.all(req.files.map(f => uploadToCloudinary(f.buffer, f.originalname)));
    updates.images = uploadResults.map(r => ({ url: r.secure_url, public_id: r.public_id }));
  }
  // Allow updating premiumVerified flag
  if (updates.premiumVerified !== undefined) {
    listing.premiumVerified = updates.premiumVerified === 'true' || updates.premiumVerified === true;
    delete updates.premiumVerified;
  }
  Object.assign(listing, updates);
  await listing.save();
  res.json(listing);
});

// @desc    Delete a listing (farmer only)
// @route   DELETE /api/listings/:id
// @access  Private (farmer)
export const deleteListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    return res.status(404).json({ message: 'Listing not found' });
  }
  if (listing.farmer.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  await listing.deleteOne();
  res.json({ message: 'Listing removed' });
});

// @desc    Get listings created by the logged-in farmer
// @route   GET /api/listings/my
// @access  Private (farmer)
export const getMyListings = asyncHandler(async (req, res) => {
  const listings = await Listing.find({ farmer: req.user.id })
    .sort({ createdAt: -1 })
    .populate('farmer', 'name avatar location');
  res.json(listings);
});

export const toggleSaveListing = asyncHandler(async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    return res.status(404).json({ message: 'Listing not found' });
  }

  // Use a savedBy array on the listing to track which users saved it
  if (!listing.savedBy) listing.savedBy = [];

  const idx = listing.savedBy.findIndex(id => id.toString() === req.user.id.toString());
  
  if (idx === -1) {
    listing.savedBy.push(req.user.id);
  } else {
    listing.savedBy.splice(idx, 1);
  }
  
  await listing.save();
  res.json({ saved: idx === -1, message: idx === -1 ? 'Listing saved' : 'Listing unsaved' });
});

// @desc    Get all listings saved by the logged-in buyer
// @route   GET /api/listings/saved
// @access  Private (buyer)
export const getSavedListings = asyncHandler(async (req, res) => {
  const listings = await Listing.find({ savedBy: req.user.id })
    .sort({ createdAt: -1 })
    .populate('farmer', 'name avatar location');
  res.json(listings);
});
