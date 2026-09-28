import express from 'express';
import { protect } from '../middleware/auth.js';
import { 
  getOrCreateChat, 
  sendMessage, 
  getMessages, 
  getOrderChat, 
  sendOrderChatMessage,
  getUnreadMessagesCount,
  getRecentOrderChats,
  markChatAsRead,
  markAllChatsAsRead
} from '../controllers/chatController.js';

const router = express.Router();

// Unread count & recent order conversations (mounted before /:chatId)
router.get('/unread/count', protect, getUnreadMessagesCount);
router.get('/recent', protect, getRecentOrderChats);
router.put('/all/read', protect, markAllChatsAsRead);
router.put('/order/:orderId/read', protect, markChatAsRead);

// Order-scoped live tri-party chat (Buyer + Farmer + Delivery Agent)
router.get('/order/:orderId', protect, getOrderChat);
router.post('/order/:orderId/message', protect, sendOrderChatMessage);

// Standard chat routes
router.post('/', protect, getOrCreateChat);
router.get('/:chatId', protect, getMessages);
router.post('/:chatId/message', protect, sendMessage);

// Backwards-compatibility aliases
router.post('/chat', protect, getOrCreateChat);
router.get('/chat/:chatId', protect, getMessages);
router.post('/chat/:chatId/message', protect, sendMessage);

export default router;
