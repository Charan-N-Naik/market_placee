import Razorpay from 'razorpay';
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';

// Initialize Razorpay client using env variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * @desc    Create Razorpay order for a payment
 * @route   POST /api/payments/create-order
 * @access  Private (buyer)
 */
export const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { amount, currency = 'INR', receipt } = req.body;
  if (!amount) {
    res.status(400);
    throw new Error('Amount is required');
  }
  const options = {
    amount: amount * 100, // Razorpay expects amount in paise
    currency,
    receipt: receipt || `order_rcpt_${Date.now()}`,
    payment_capture: 1,
  };
  
  let order;
  try {
    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID.includes('dummy')) {
      throw new Error('Using dummy credentials');
    }
    order = await razorpay.orders.create(options);
  } catch (err) {
    console.warn('⚠️ Razorpay order creation failed, using simulated/mock order:', err.message);
    order = {
      id: `order_sim_${Math.random().toString(36).substring(2, 15)}`,
      amount: options.amount,
      currency: options.currency,
      receipt: options.receipt,
      status: 'created',
    };
  }

  // Store a reference order in DB for later verification
  const dbOrder = await Order.create({
    buyer: req.user.id,
    razorpayOrderId: order.id,
    amount,
    currency,
    status: 'created',
    receipt: order.receipt,
  });
  res.json({ order, dbOrderId: dbOrder._id });
});

/**
 * @desc    Verify Razorpay webhook signature and update order status
 * @route   POST /api/payments/webhook
 * @access  Public (Razorpay posts)
 */
export const razorpayWebhook = asyncHandler(async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];
  const payload = JSON.stringify(req.body);
  const crypto = await import('crypto');
  const generatedSignature = crypto.default
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  if (generatedSignature !== signature) {
    res.status(400).send('Invalid signature');
    return;
  }

  const { payload: webhookPayload } = req.body;
  const paymentEntity = webhookPayload?.payment?.entity;
  if (paymentEntity && paymentEntity.status === 'captured') {
    const order = await Order.findOne({ razorpayOrderId: paymentEntity.order_id });
    if (order) {
      order.status = 'paid';
      await order.save();
    }
  }
  res.json({ status: 'ok' });
});
