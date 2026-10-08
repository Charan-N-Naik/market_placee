import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Notification from '../models/Notification.js';

/**
 * @desc    Get all notifications for the logged-in user
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({
    recipient: req.user._id,
    type: { $ne: 'message' },
  })
    .populate('sender', 'name avatar email phone')
    .populate({
      path: 'relatedOrder',
      select: 'orderNumber status totalAmount items createdAt',
      populate: {
        path: 'items.listing',
        select: 'cropName images pricePerUnit'
      }
    })
    .populate('relatedChat', 'lastMessage')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

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
    type: { $ne: 'message' },
  });

  res.json({ unreadCount: count, count });
});

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/notifications/:notificationId/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.notificationId)) {
    return res.status(400).json({ message: 'Invalid notification id' });
  }
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

  const count = await Notification.countDocuments({
    recipient: req.user._id,
    read: false,
    type: { $ne: 'message' },
  });

  if (req.io) {
    const uid = req.user._id.toString();
    req.io.to(uid).emit('unread_count_update', { unreadCount: count, count });
    req.io.to(`user:${uid}`).emit('unread_count_update', { unreadCount: count, count });
  }

  res.json({ notification, unreadCount: count, count });
});

/**
 * @desc    Mark all notifications as read for the user
 * @route   PUT /api/notifications/all/read
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { recipient: req.user._id, read: false, type: { $ne: 'message' } },
    { $set: { read: true, readAt: new Date() } }
  );

  if (req.io) {
    const uid = req.user._id.toString();
    req.io.to(uid).emit('unread_count_update', { unreadCount: 0, count: 0 });
    req.io.to(`user:${uid}`).emit('unread_count_update', { unreadCount: 0, count: 0 });
  }

  res.json({ message: 'All notifications marked as read', unreadCount: 0, count: 0 });
});

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:notificationId
 * @access  Private
 */
export const deleteNotification = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.notificationId)) {
    return res.status(400).json({ message: 'Invalid notification id' });
  }
  const notification = await Notification.findById(req.params.notificationId);

  if (!notification) {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
      type: { $ne: 'message' },
    });
    return res.json({ message: 'Notification already deleted or not found', unreadCount: count, count });
  }

  // Verify the user owns this notification
  if (notification.recipient.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  await Notification.findByIdAndDelete(req.params.notificationId);

  const count = await Notification.countDocuments({
    recipient: req.user._id,
    read: false,
    type: { $ne: 'message' },
  });

  if (req.io) {
    const uid = req.user._id.toString();
    req.io.to(uid).emit('unread_count_update', { unreadCount: count, count });
    req.io.to(`user:${uid}`).emit('unread_count_update', { unreadCount: count, count });
    req.io.to(uid).emit('notification_deleted', { notificationId: req.params.notificationId });
    req.io.to(`user:${uid}`).emit('notification_deleted', { notificationId: req.params.notificationId });
  }

  res.json({ message: 'Notification deleted', unreadCount: count, count });
});

/**
 * @desc    Clear all notifications for the user
 * @route   DELETE /api/notifications/all/clear
 * @access  Private
 */
export const clearAllNotifications = asyncHandler(async (req, res) => {
  await Notification.deleteMany({
    recipient: req.user._id,
    type: { $ne: 'message' },
  });

  if (req.io) {
    const uid = req.user._id.toString();
    req.io.to(uid).emit('unread_count_update', { unreadCount: 0, count: 0 });
    req.io.to(`user:${uid}`).emit('unread_count_update', { unreadCount: 0, count: 0 });
  }

  res.json({ message: 'All notifications cleared', unreadCount: 0, count: 0 });
});

