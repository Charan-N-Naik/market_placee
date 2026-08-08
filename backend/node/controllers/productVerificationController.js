/**
 * productVerificationController.js
 * ==================================
 * Controller that proxies requests to the CropVerify AI FastAPI microservice
 * on port 5002. The Node backend acts as a secure gateway — auth is enforced
 * here via the protect middleware before any call is forwarded.
 */

import asyncHandler from 'express-async-handler';
import Listing from '../models/Listing.js';
import fetch from 'node-fetch';

const FASTAPI_BASE = process.env.CROPVERIFY_SERVICE_URL || 'http://127.0.0.1:5002';

// ---------------------------------------------------------------------------
// GET /api/product/:id/report
// Proxy → FastAPI GET /verify/product/:id/report (streams PDF)
// ---------------------------------------------------------------------------
export const getVerificationReport = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // 1. Verify listing exists in MongoDB (fast guard before calling FastAPI)
  const listing = await Listing.findById(id).select('cropName verification').lean();
  if (!listing) {
    return res.status(404).json({ message: 'Listing not found.' });
  }

  const status = listing.verification?.status;
  if (status === 'pending_review' || !status) {
    return res.status(409).json({
      message: 'Verification is still pending review. Report will be available once complete.',
    });
  }
  if (status === 'rejected') {
    return res.status(403).json({
      message: 'This listing was rejected — no verification report is available.',
    });
  }

  // 2. Forward to FastAPI microservice
  const upstream = `${FASTAPI_BASE}/verify/product/${id}/report`;
  let upstreamRes;
  try {
    upstreamRes = await fetch(upstream);
  } catch (err) {
    console.error('[ProductVerification] FastAPI unreachable:', err.message);
    return res.status(503).json({
      message: 'Verification service is currently unavailable. Please try again shortly.',
      hint: 'Ensure the CropVerify FastAPI service is running on port 5002.',
    });
  }

  if (!upstreamRes.ok) {
    const errBody = await upstreamRes.json().catch(() => ({}));
    return res.status(upstreamRes.status).json({
      message: errBody.detail || 'Failed to generate verification report.',
    });
  }

  // 3. Stream PDF back to client
  const cropName = (listing.cropName || 'product').replace(/\s+/g, '_');
  const filename = `CropVerify_Report_${cropName}_${id.slice(-6)}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  upstreamRes.body.pipe(res);
});


// ---------------------------------------------------------------------------
// GET /api/product/:id/status
// Returns the verification sub-doc from MongoDB — no FastAPI call needed.
// ---------------------------------------------------------------------------
export const getVerificationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id)
    .select('cropName aiVerified verification')
    .lean();

  if (!listing) {
    return res.status(404).json({ message: 'Listing not found.' });
  }

  const verif = listing.verification || {};
  return res.json({
    listingId:         id,
    cropName:          listing.cropName,
    aiVerified:        listing.aiVerified || false,
    status:            verif.status        || 'not_started',
    trustScore:        verif.trust_score   || null,
    authenticityScore: verif.authenticity_score || null,
    locationValid:     verif.location_valid ?? null,
    resolvedAddress:   verif.resolved_address  || null,
    diseaseLabel:      verif.disease_label     || null,
    healthyLeaf:       verif.healthy_leaf      ?? null,
    reasons:           verif.authenticity_reasons || [],
    geoFlags:          verif.geo_flags        || [],
    verifiedAt:        verif.verified_at      || null,
  });
});
