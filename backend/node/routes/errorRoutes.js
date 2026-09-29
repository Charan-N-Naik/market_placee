import express from 'express';
import { logError } from '../services/errorLoggerService.js';
import AppError from '../models/AppError.js';

const router = express.Router();

// @route   POST /api/errors
// @desc    Record client-side error from web or mobile app
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { message, stack, url, metadata, componentStack } = req.body || {};
    if (!message) {
      return res.status(400).json({ success: false, message: 'Error message is required' });
    }

    const recorded = await logError({
      type: 'clientError',
      message: String(message),
      stack: stack || componentStack,
      url: url || req.headers.referer,
      method: req.method,
      userId: req.user?._id || null,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata,
    });

    res.status(201).json({ success: true, id: recorded?._id });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to record error' });
  }
});

// @route   GET /api/errors/recent
// @desc    Get recent 50 recorded errors for diagnostics
// @access  Public / Diagnostics
router.get('/recent', async (req, res) => {
  try {
    const errors = await AppError.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, count: errors.length, errors });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch errors' });
  }
});

export default router;
