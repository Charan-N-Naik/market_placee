import Notification from '../models/Notification.js';

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
}) => {
  try {
    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type,
      title,
      message,
      relatedOrder,
      relatedChat,
    });

    // TODO: Integrate with Socket.io for real-time notifications if available
    // io.to(recipientId).emit('notification', notification);

    return notification;
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
