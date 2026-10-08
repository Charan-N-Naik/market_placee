import crypto from 'crypto';
import Razorpay from 'razorpay';
import asyncHandler from 'express-async-handler';
import Order from '../models/Order.js';

let razorpayClient = null;

/**
 * Lazily initialize and return the Razorpay client.
 * Throws a clear error if Razorpay API keys are not configured.
 */
export const getRazorpay = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    const error = new Error('Razorpay configuration error: RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required');
    error.statusCode = 500;
    throw error;
  }

  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  return razorpayClient;
};

const timingSafeEqualCompare = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

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
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET ||
        process.env.RAZORPAY_KEY_ID.includes('dummy')) {
      throw new Error('Using dummy credentials');
    }
    order = await getRazorpay().orders.create(options);
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

  // Check if an existing order was specified to link the payment reference
  let dbOrderId = null;
  const targetOrderId = req.body.orderId || (receipt && receipt.startsWith('rcpt_') ? receipt.replace('rcpt_', '') : null);
  if (targetOrderId) {
    try {
      const existing = await Order.findByIdAndUpdate(targetOrderId, { paymentId: order.id, razorpayOrderId: order.id }, { new: true });
      if (existing) dbOrderId = existing._id;
    } catch (_) {}
  }

  res.json({ order, dbOrderId });
});

/**
 * @desc    Verify Razorpay payment signature (buyer only)
 * @route   POST /api/payments/verify
 * @access  Private (buyer)
 */
export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: 'Missing required payment verification parameters' });
  }

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  // Verify that the order belongs to the calling buyer
  const isCallerBuyer = order.buyer && order.buyer.toString() === req.user._id.toString();
  if (!isCallerBuyer) {
    return res.status(404).json({ message: 'Order not found for current user' });
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return res.status(500).json({ message: 'Razorpay secret key not configured' });
  }

  // Compute HMAC SHA256 of "order_id|payment_id"
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (!timingSafeEqualCompare(expectedSignature, razorpay_signature)) {
    return res.status(400).json({ message: 'Invalid payment signature' });
  }

  order.status = 'paid';
  order.paymentId = razorpay_payment_id;
  order.razorpayOrderId = razorpay_order_id;
  await order.save();

  // Send status update notification to farmer if exists
  try {
    const { sendNotification } = await import('../services/notificationService.js');
    if (order.farmer) {
      await sendNotification({
        recipientId: order.farmer,
        senderId: req.user._id,
        type: 'order_status_update',
        title: '💳 Payment Received!',
        message: `Buyer has completed payment of ₹${order.totalAmount}. Please start packing the order.`,
        relatedOrder: order._id,
      });
    }
  } catch (_) {}

  return res.json({ success: true, message: 'Payment verified successfully', order });
});

/**
 * @desc    Verify Razorpay webhook signature and update order status
 * @route   POST /api/payments/webhook
 * @access  Public (Razorpay posts)
 */
export const razorpayWebhook = asyncHandler(async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ message: 'RAZORPAY_WEBHOOK_SECRET is not configured' });
  }

  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    return res.status(400).send('Missing webhook signature');
  }

  let hmac = crypto.createHmac('sha256', secret);
  if (req.rawBody && Buffer.isBuffer(req.rawBody)) {
    hmac.update(req.rawBody);
  } else if (typeof req.body === 'string') {
    hmac.update(req.body);
  } else {
    hmac.update(JSON.stringify(req.body));
  }
  const generatedSignature = hmac.digest('hex');

  if (!timingSafeEqualCompare(generatedSignature, signature)) {
    return res.status(400).send('Invalid signature');
  }

  const body = (typeof req.body === 'string') ? JSON.parse(req.body) : req.body;
  const event = body?.event;
  const paymentEntity = body?.payload?.payment?.entity;

  if (event === 'payment.captured' || (paymentEntity && paymentEntity.status === 'captured')) {
    const query = {
      $or: [
        { paymentId: paymentEntity?.order_id },
        { paymentId: paymentEntity?.id },
        { razorpayOrderId: paymentEntity?.order_id },
        { _id: (paymentEntity?.notes?.orderId || null) },
      ].filter(clause => Object.values(clause)[0] != null)
    };

    if (query.$or.length > 0) {
      const order = await Order.findOne(query);
      if (order) {
        if (order.status === 'paid') {
          // Idempotent: already marked as paid
          return res.status(200).json({ status: 'ok', message: 'Order already marked as paid' });
        }

        order.status = 'paid';
        if (paymentEntity?.id) {
          order.paymentId = paymentEntity.id;
        }
        if (paymentEntity?.order_id) {
          order.razorpayOrderId = paymentEntity.order_id;
        }
        await order.save();
      }
    }
  }

  return res.json({ status: 'ok' });
});
