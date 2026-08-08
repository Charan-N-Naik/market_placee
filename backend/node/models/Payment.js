import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },
  provider: { type: String, enum: ['razorpay', 'stripe'], required: true },
  providerPaymentId: { type: String, required: true }, // e.g., Razorpay payment_id or Stripe session_id
  status: { type: String, enum: ['created', 'successful', 'failed', 'refunded'], default: 'created' },
  receiptUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

paymentSchema.index({ providerPaymentId: 1 }, { unique: true });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
