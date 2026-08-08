import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  quantity: { type: Number, required: true, min: 1 },
  priceAtPurchase: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema(
  {
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'packed', 'paid', 'shipped', 'delivered', 'received', 'cancelled', 'refunded'],
      default: 'pending',
    },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Denormalized for fast farmer queries
    paymentMethod: {
      type: String,
      enum: ['online', 'cod', 'wallet'],
      default: 'online',
    },
    paymentId: { type: String },
    invoiceUrl: { type: String },
    deliveryAddress: {
      addressLine1: { type: String },
      addressLine2: String,
      city: { type: String },
      state: { type: String },
      postalCode: { type: String },
      country: { type: String, default: 'India' },
      fullAddress: { type: String },
    },
    trackingNumber: { type: String },
    relatedChat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    rating: { type: Number, min: 1, max: 5 },
    ratingComment: { type: String },
    receivedDate: { type: Date },
  },
  { timestamps: true }
);

const Order = mongoose.model('Order', orderSchema);
export default Order;
