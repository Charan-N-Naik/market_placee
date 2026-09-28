import express from 'express';
import { protect } from '../middleware/auth.js';
import { createRazorpayOrder, verifyPayment, razorpayWebhook } from '../controllers/paymentsController.js';

const router = express.Router();

// Create a Razorpay order (buyer must be authenticated)
router.post('/create', protect, createRazorpayOrder);
router.post('/create-order', protect, createRazorpayOrder);

// Verify Razorpay payment signature (buyer only)
router.post('/verify', protect, verifyPayment);

// Webhook endpoints – no auth, verify signature inside controller
router.post('/webhook', razorpayWebhook);
router.post('/webhook/razorpay', razorpayWebhook);

export default router;
