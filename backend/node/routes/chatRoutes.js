import express from 'express';
import { protect, requireRole } from '../middleware/auth.js';
import { getOrCreateChat, sendMessage, getMessages } from '../controllers/chatController.js';

const router = express.Router();

// Protected routes – both buyer and farmer must be authenticated
router.post('/chat', protect, getOrCreateChat);
router.get('/chat/:chatId', protect, getMessages);
router.post('/chat/:chatId/message', protect, sendMessage);

export default router;
