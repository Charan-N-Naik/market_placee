import asyncHandler from 'express-async-handler';
import Notification from '../models/Notification.js';

/**
 * @desc    Get all notifications for the logged-in user
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ recipient: req.user._id })
    .populate('sender', 'name avatar')
    .populate('relatedOrder')
    .populate('relatedChat')
    .sort({ createdAt: -1 });

  res.json(notifications);
});

/**
 * @desc    Get unread notifications count for the logged-in user
 * @route   GET /api/notifications/unread/count
 * @access  Private
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    recipient: req.user._id,
    read: false,
  });

  res.json({ unreadCount: count });
});

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/notifications/:notificationId/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.notificationId);

  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  // Verify the user owns this notification
  if (notification.recipient.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  notification.read = true;
  notification.readAt = new Date();
  await notification.save();

  res.json(notification);
});

/**
 * @desc    Mark all notifications as read for the user
 * @route   PUT /api/notifications/all/read
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, read: false },
    { $set: { read: true, readAt: new Date() } }
  );

  res.json({ message: 'All notifications marked as read' });
});

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:notificationId
 * @access  Private
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.notificationId);

  if (!notification) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  // Verify the user owns this notification
  if (notification.recipient.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  await Notification.findByIdAndDelete(req.params.notificationId);

  res.json({ message: 'Notification deleted' });
});
