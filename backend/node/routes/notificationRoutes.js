import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} from '../controllers/notificationController.js';

const router = express.Router();

// Get all notifications
router.get('/', protect, getNotifications);

// Get unread count
router.get('/unread/count', protect, getUnreadCount);

// IMPORTANT: Static routes MUST be declared BEFORE parameterised routes.
// PUT /all/read must come before PUT /:notificationId/read, otherwise Express
// matches the literal string "all" as notificationId, findById("all") throws
// a CastError, and nothing is written to MongoDB.
router.put('/all/read', protect, markAllAsRead);

// Mark a single notification as read
router.put('/:notificationId/read', protect, markAsRead);

// DELETE /all/clear must also come before DELETE /:notificationId (same reason).
router.delete('/all/clear', protect, clearAllNotifications);

// Delete a single notification
router.delete('/:notificationId', protect, deleteNotification);

export default router;
