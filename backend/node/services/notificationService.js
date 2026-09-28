import Notification from '../models/Notification.js';

let _io = null;

export const setNotificationIO = (ioInstance) => {
  _io = ioInstance;
};

export const getNotificationIO = () => {
  return _io || global.io;
};

/**
 * Create and send a notification to a recipient
 */
export const sendNotification = async ({
  recipientId,
  senderId,
  type,
  title,
  message,
  relatedOrder,
  relatedChat,
  buyerName,
  cropName,
  orderNumber,
}, customIo = null) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type,
      title,
      message,
      relatedOrder,
      relatedChat,
      buyerName,
      cropName,
      orderNumber,
    });

    // Populate references so the real-time event has complete details
    const populated = await Notification.findById(notification._id)
      .populate('sender', 'name avatar email phone')
      .populate({
        path: 'relatedOrder',
        select: 'orderNumber status totalAmount items createdAt',
        populate: {
          path: 'items.listing',
          select: 'cropName images pricePerUnit'
        }
      })
      .lean();

    const activeIo = customIo || _io || global.io;
    if (activeIo && recipientId) {
      const recipientStr = recipientId.toString();
      // Emit to recipient's personal socket rooms
      activeIo.to(recipientStr).emit('new_notification', populated);
      activeIo.to(`user:${recipientStr}`).emit('new_notification', populated);

      const unreadCount = await Notification.countDocuments({
        recipient: recipientId,
        read: false,
      });

      activeIo.to(recipientStr).emit('unread_count_update', { unreadCount, count: unreadCount });
      activeIo.to(`user:${recipientStr}`).emit('unread_count_update', { unreadCount, count: unreadCount });
    }

    return populated || notification;
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
};

/**
 * Get all unread notifications for a user
 */
export const getUnreadNotifications = async (userId) => {
  try {
    return await Notification.find({ recipient: userId, read: false })
      .populate('sender', 'name avatar')
      .populate('relatedOrder')
      .populate('relatedChat')
      .sort({ createdAt: -1 });
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    throw error;
  }
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    return await Notification.findByIdAndUpdate(
      notificationId,
      { read: true, readAt: new Date() },
      { new: true }
    );
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};
