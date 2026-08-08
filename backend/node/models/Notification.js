import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: ['order_placed', 'order_delivered', 'payment_received', 'message', 'rating', 'custom'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    relatedChat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
  },
  { timestamps: true }
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
