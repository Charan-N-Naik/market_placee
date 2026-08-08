import express from 'express';
import { scanCrop, uploadMiddleware } from '../controllers/verificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Protected route – only authenticated users can scan
router.post('/scan', protect, uploadMiddleware, scanCrop);

export default router;
