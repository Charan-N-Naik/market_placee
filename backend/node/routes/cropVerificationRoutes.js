import express from 'express';
import { protect } from '../middleware/auth.js';
import { analyzeCrop, uploadMiddleware } from '../controllers/cropVerificationController.js';

const router = express.Router();

// POST /api/crop-verification/analyze
// Accepts: front (required), left (optional), right (optional) as multipart fields
// Body: cropType (string), role (string), listingId (string, optional)
router.post('/analyze', protect, uploadMiddleware, analyzeCrop);

export default router;
