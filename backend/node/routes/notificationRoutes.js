import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationController.js';

const router = express.Router();

// Get all notifications
router.get('/', protect, getNotifications);

// Get unread count
router.get('/unread/count', protect, getUnreadCount);

// Mark notification as read
router.put('/:notificationId/read', protect, markAsRead);

// Mark all as read
router.put('/all/read', protect, markAllAsRead);

// Delete notification
router.delete('/:notificationId', protect, deleteNotification);

export default router;
