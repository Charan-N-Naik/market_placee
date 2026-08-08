import express from 'express';
import { protect } from '../middleware/auth.js';
import { createRazorpayOrder, razorpayWebhook } from '../controllers/paymentsController.js';

const router = express.Router();

// Create a Razorpay order (buyer must be authenticated)
router.post('/create', protect, createRazorpayOrder);

// Webhook endpoint – no auth, verify signature inside controller
router.post('/webhook/razorpay', express.raw({ type: 'application/json' }), razorpayWebhook);

export default router;
