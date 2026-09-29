import Notification from '../models/Notification.js';
import User from '../models/User.js';

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

    // Trigger push notification non-blockingly (never blocks main operation)
    if (recipientId) {
      sendPushNotification(recipientId, title, message, {
        orderId: relatedOrder ? relatedOrder.toString() : undefined,
        relatedChat: relatedChat ? relatedChat.toString() : undefined,
        type,
        orderNumber,
      }).catch(err => console.warn('[Push Notification Warning]:', err.message));
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

/**
 * Send push notification to user's registered device via FCM API.
 * Wrapped in try/catch so push failure never blocks the main action.
 *
 * @param {string|mongoose.Types.ObjectId} userId
 * @param {string} title
 * @param {string} body
 * @param {object} [data]
 */
export const sendPushNotification = async (userId, title, body, data = {}) => {
  try {
    if (!userId) return null;
    const user = await User.findById(userId).select('fcmToken name email');
    if (!user || !user.fcmToken) {
      return null;
    }

    const serverKey = process.env.FCM_SERVER_KEY;
    if (!serverKey) {
      // Graceful local/simulated push log when FCM server key is not in .env
      console.log(`[Push Notification (FCM Simulated)] To: ${user.name} (${user.email}) | Title: "${title}" | Body: "${body}"`);
      return { simulated: true, success: true, fcmToken: user.fcmToken };
    }

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${serverKey}`,
      },
      body: JSON.stringify({
        to: user.fcmToken,
        notification: {
          title,
          body,
          sound: 'default',
        },
        data: {
          ...data,
          orderId: data?.orderId ? String(data.orderId) : undefined,
          click_action: data?.orderId ? `kisanbazaar://order/${data.orderId}` : 'FLUTTER_NOTIFICATION_CLICK',
        },
      }),
    });

    const resData = await response.json();
    return resData;
  } catch (pushErr) {
    console.error(`[Push Notification Warning] Non-blocking push error for user ${userId}:`, pushErr.message);
    return null;
  }
};

