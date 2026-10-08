import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: [
        'order_placed',
        'order_delivered',
        'order_status_update',
        'order_cancelled',
        'order_accepted',
        'order_packed',
        'order_collected',
        'delivery_confirmed',
        'payment_received',
        'message',
        'rating',
        'custom',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    relatedChat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    buyerName: { type: String },
    cropName: { type: String },
    orderNumber: { type: String },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });
// Compound index for fast unread-count queries
notificationSchema.index({ recipient: 1, read: 1, type: 1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;

