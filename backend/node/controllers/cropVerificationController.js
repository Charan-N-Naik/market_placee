import asyncHandler from 'express-async-handler';
import multer from 'multer';
import { analyzeCropImagesMultiAngle } from '../services/aiService.js';
import Listing from '../models/Listing.js';

// Accept up to 3 angle fields: front, left, right (10MB max per photo)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
export const uploadMiddleware = upload.fields([
  { name: 'front', maxCount: 1 },
  { name: 'left',  maxCount: 1 },
  { name: 'right', maxCount: 1 },
]);

/**
 * @desc    Multi-angle AI crop quality verification (real Gemini vision)
 * @route   POST /api/crop-verification/analyze
 * @access  Private
 */
export const analyzeCrop = asyncHandler(async (req, res) => {
  const files = req.files || {};

  // Build image array — all 3 angles (front, left, right) are required
  const images = [];
  for (const angle of ['front', 'left', 'right']) {
    const fileArr = files[angle];
    if (fileArr && fileArr[0]) {
      images.push({
        buffer:   fileArr[0].buffer,
        mimeType: fileArr[0].mimetype,
        angle,
      });
    }
  }

  if (images.length < 3) {
    return res.status(400).json({ message: 'All 3 harvest photos (Front View, Left Side, Right Side) are required for AI verification.' });
  }

  const cropType = req.body.cropType || '';
  const role     = req.body.role     || req.user?.role || 'buyer';

  // Run real Gemini multi-angle analysis
  let result;
  try {
    result = await analyzeCropImagesMultiAngle(images, cropType, role);
  } catch (err) {
    console.error('[CropVerification] Gemini analysis failed:', err);
    let userMsg = 'AI verification service is temporarily busy. Please try again in a few moments.';
    const rawMsg = err.message || '';
    if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
      userMsg = 'AI rate limit exceeded. Please wait a moment and click "Try Again".';
    } else if (rawMsg.includes('Gemini API key')) {
      userMsg = 'AI verification unavailable: Gemini API key is missing on backend.';
    } else if (rawMsg && !rawMsg.startsWith('{')) {
      userMsg = rawMsg;
    }
    return res.status(502).json({
      message: userMsg,
      error: userMsg,
    });
  }

  // If rejected (AI-generated or mismatch) — return 422 with clear reason
  if (result.rejected) {
    return res.status(422).json({
      rejected:      true,
      rejectionType: result.rejectionType,
      reason:        result.reason,
      ...(result.angle          && { angle:          result.angle }),
      ...(result.detectedCrops  && { detectedCrops:  result.detectedCrops }),
      ...(result.aiDetectionConfidence && { aiDetectionConfidence: result.aiDetectionConfidence }),
    });
  }

  const report = result.report;

  // Optional: persist report to a listing document if listingId was sent
  const listingId = req.body.listingId;
  if (listingId) {
    try {
      await Listing.findByIdAndUpdate(listingId, {
        aiVerified: true,
        verificationReport: {
          cropName:              report.cropName,
          variety:               report.variety,
          qualityGrade:          report.qualityGrade,
          trustScore:            report.trustScore,
          ripeness:              report.ripeness,
          freshness:             report.freshness,
          defects:               report.defects,
          pestDetection:         report.pestDetection,
          estimatedShelfLife:    report.estimatedShelfLife,
          estimatedPricePerKg:   report.estimatedPricePerKg,
          storageRecommendation: report.storageRecommendation,
          summary:               report.summary,
          analyzedAngles:        images.map(i => i.angle),
          analysisTimestamp:     new Date(),
        },
      });
    } catch (err) {
      // Non-blocking — don't fail the whole request if DB write fails
      console.warn('[CropVerification] Failed to persist report to listing:', err.message);
    }
  }

  return res.status(200).json({
    rejected:      false,
    anglesAnalyzed: images.map(i => i.angle),
    report,
  });
});
