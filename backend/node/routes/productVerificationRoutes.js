/**
 * productVerificationRoutes.js
 * ==============================
 * Proxy routes for the CropVerify AI FastAPI microservice (port 5002).
 *
 * These routes are protected by the existing Node.js auth middleware,
 * ensuring the FastAPI service itself doesn't need its own auth layer.
 *
 * Routes:
 *   GET  /api/product/:id/report     → streams PDF from FastAPI /verify/product/:id/report
 *   GET  /api/product/:id/status     → fetches verification status for a listing
 */

import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getVerificationReport,
  getVerificationStatus,
} from '../controllers/productVerificationController.js';

const router = express.Router();

// GET  /api/product/:id/report  — stream PDF verification report
router.get('/:id/report', protect, getVerificationReport);

// GET  /api/product/:id/status  — quick status check (trust_score, status)
router.get('/:id/status', protect, getVerificationStatus);

export default router;
