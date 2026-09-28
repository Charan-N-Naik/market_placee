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
      enum: ['pending', 'accepted', 'packed', 'paid', 'shipped', 'collected', 'delivered', 'received', 'cancelled', 'refunded'],
      default: 'pending',
    },
    farmer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Denormalized for fast farmer queries
    paymentMethod: {
      type: String,
      enum: ['online', 'cod', 'wallet', 'pending_farmer_approval', 'upi', 'card', 'netbanking'],
      default: 'pending_farmer_approval',
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
    
    // Delivery Agent Ecosystem integration
    deliveryMode: {
      type: String,
      enum: ['buyer_choice', 'auto_assign'],
      required: true,
    },
    chosenAgentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    packedAt: { type: Date },
    pickupDeadline: { type: Date },
    deliveryOffers: [
      {
        agent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        offeredAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ['offered', 'accepted', 'declined', 'expired'],
          default: 'offered',
        },
      },
    ],
    lastKnownAgentLocation: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date },
    },
    deliveryAgent: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveryDistance: { type: Number }, // in km
    deliveryFare: { type: Number }, // total cost for delivery
    deliveryRequestStatus: {
      type: String,
      enum: ['none', 'pending_driver_approval', 'driver_accepted', 'driver_rejected', 'collected', 'delivered'],
      default: 'none'
    },
  },
  { timestamps: true }
);

orderSchema.index({ buyer: 1, createdAt: -1 });
orderSchema.index({ farmer: 1, createdAt: -1 });
orderSchema.index({ deliveryAgent: 1 });
orderSchema.index({ status: 1, pickupDeadline: 1 });
orderSchema.index({ 'deliveryOffers.agent': 1 });

const Order = mongoose.model('Order', orderSchema);
export default Order;
