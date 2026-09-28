import asyncHandler from 'express-async-handler';
import Chat from '../models/Chat.js';

/**
 * @desc    Get existing chat between two participants or create a new one
 * @route   POST /api/chat
 * @access  Private (authenticated users)
 */
export const getOrCreateChat = asyncHandler(async (req, res) => {
  const userId = req.user.id; // authenticated user
  const { participantId } = req.body; // the other participant's user id

  if (!participantId) {
    return res.status(400).json({ message: 'participantId is required' });
  }

  // Search for an existing chat containing exactly these two participants
  const existingChat = await Chat.findOne({
    participants: { $all: [userId, participantId] },
    isGroup: false,
  })
    .populate('participants', 'name avatar location')
    .populate('messages.sender', 'name avatar');

  if (existingChat) {
    return res.json(existingChat);
  }

  // No chat exists – create a new one
  const newChat = await Chat.create({
    participants: [userId, participantId],
    messages: [],
    isGroup: false,
  });

  const populatedChat = await Chat.findById(newChat._id)
    .populate('participants', 'name avatar location');

  res.status(201).json(populatedChat);
});

/**
 * @desc    Get all messages for a chat
 * @route   GET /api/chat/:chatId
 * @access  Private
 */
export const getMessages = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const chat = await Chat.findById(chatId)
    .populate('participants', 'name avatar location')
    .populate('messages.sender', 'name avatar');

  if (!chat) {
    return res.status(404).json({ message: 'Chat not found' });
  }

  // Ensure the requester is a participant
  if (!chat.participants.some(p => p._id.toString() === req.user.id)) {
    return res.status(403).json({ message: 'Not authorized to view this chat' });
  }

  res.json({ messages: chat.messages, participants: chat.participants });
});

/**
 * @desc    Get or initialize order-scoped chat room for Farmer, Buyer, and Delivery Agent
 * @route   GET /api/chat/order/:orderId
 * @access  Private
 */
export const getOrderChat = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { default: Order } = await import('../models/Order.js');
  const { isUserAuthorizedForOrder } = await import('./orderController.js');

  const order = await Order.findById(orderId)
    .populate('farmer', 'name role email phone location avatar')
    .populate('buyer', 'name role email phone location avatar')
    .populate('deliveryAgent', 'name role email phone location avatar deliveryAgentProfile')
    .populate('items.listing', 'cropName pricePerUnit quantity unit images');

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  if (!isUserAuthorizedForOrder(order, req.user)) {
    return res.status(403).json({ message: 'Not authorized for this order chat' });
  }

  // Collect all participants for this order
  const participantIds = [];
  if (order.buyer?._id) participantIds.push(order.buyer._id);
  if (order.farmer?._id) participantIds.push(order.farmer._id);
  if (order.deliveryAgent?._id) participantIds.push(order.deliveryAgent._id);

  // If chat already linked to order, use it
  let chat = null;
  if (order.relatedChat) {
    chat = await Chat.findById(order.relatedChat)
      .populate('participants', 'name role email phone avatar location')
      .populate('messages.sender', 'name role email avatar');
  }

  if (!chat) {
    // Look for existing chat by order participant matching
    chat = await Chat.findOne({
      participants: { $all: [order.buyer?._id || req.user.id, order.farmer?._id || req.user.id].filter(Boolean) },
      isGroup: true,
    })
      .populate('participants', 'name role email phone avatar location')
      .populate('messages.sender', 'name role email avatar');
  }

  if (!chat) {
    // Create new group chat for the order
    chat = await Chat.create({
      participants: participantIds.length > 0 ? participantIds : [req.user.id],
      messages: [],
      isGroup: true,
    });

    order.relatedChat = chat._id;
    await order.save();

    chat = await Chat.findById(chat._id)
      .populate('participants', 'name role email phone avatar location');
  } else if (!order.relatedChat) {
    order.relatedChat = chat._id;
    await order.save();
  }

  // Mark messages sent by others as read by current user
  let chatModified = false;
  (chat.messages || []).forEach(m => {
    const senderStr = (m.sender?._id || m.sender)?.toString();
    if (senderStr && senderStr !== req.user.id) {
      if (!m.readBy) m.readBy = [];
      const hasRead = m.readBy.some(id => (id?._id || id)?.toString() === req.user.id);
      if (!hasRead) {
        m.readBy.push(req.user.id);
        m.read = true;
        chatModified = true;
      }
    }
  });

  if (chatModified) {
    await chat.save();
    if (req.io) {
      calcUnreadMessageCount(req.user.id).then(cnt => {
        req.io.to(req.user.id).emit('unread_message_count_update', { unreadCount: cnt, count: cnt });
        req.io.to(`user:${req.user.id}`).emit('unread_message_count_update', { unreadCount: cnt, count: cnt });
      }).catch(() => {});
    }
  }

  // Format messages cleanly
  const formattedMessages = (chat.messages || []).map(m => ({
    _id: m._id,
    orderId,
    sender: {
      _id: m.sender?._id || m.sender,
      name: m.sender?.name || (m.sender?.toString() === req.user.id ? req.user.name : 'Participant'),
      role: m.sender?.role || 'user',
    },
    text: m.content || '',
    type: m.type || 'text',
    createdAt: m.timestamp || m.createdAt || new Date(),
  }));

  res.json({
    chatId: chat._id,
    orderId: order._id,
    order: {
      _id: order._id,
      status: order.status,
      totalAmount: order.totalAmount,
      farmer: order.farmer,
      buyer: order.buyer,
      deliveryAgent: order.deliveryAgent,
      cropName: order.items?.[0]?.cropName || order.items?.[0]?.listing?.cropName || 'Farm Crop',
    },
    participants: chat.participants,
    messages: formattedMessages,
  });
});

/**
 * @desc    Send a message in an order-scoped chat room
 * @route   POST /api/chat/order/:orderId/message
 * @access  Private
 */
export const sendOrderChatMessage = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { content, text } = req.body;
  const messageText = (content || text || '').trim();

  if (!messageText) {
    return res.status(400).json({ message: 'Message content is required' });
  }

  const { default: Order } = await import('../models/Order.js');
  const { isUserAuthorizedForOrder } = await import('./orderController.js');

  const order = await Order.findById(orderId)
    .populate('farmer', 'name role')
    .populate('buyer', 'name role')
    .populate('deliveryAgent', 'name role');

  if (!order) {
    return res.status(404).json({ message: 'Order not found' });
  }

  if (!isUserAuthorizedForOrder(order, req.user)) {
    return res.status(403).json({ message: 'Not authorized to send messages for this order' });
  }

  let chat = null;
  if (order.relatedChat) {
    chat = await Chat.findById(order.relatedChat);
  }

  if (!chat) {
    const participantIds = [order.buyer?._id, order.farmer?._id, order.deliveryAgent?._id].filter(Boolean);
    chat = await Chat.create({
      participants: participantIds.length ? participantIds : [req.user.id],
      messages: [],
      isGroup: true,
    });
    order.relatedChat = chat._id;
    await order.save();
  }

  // Ensure current user is in participants list
  if (!chat.participants.some(p => p.toString() === req.user.id)) {
    chat.participants.push(req.user.id);
  }

  const newMsgObj = {
    sender: req.user.id,
    type: 'text',
    content: messageText,
    timestamp: new Date(),
    read: false,
    readBy: [req.user.id],
  };

  chat.messages.push(newMsgObj);
  await chat.save();

  const savedMsg = chat.messages[chat.messages.length - 1];

  const payload = {
    _id: savedMsg._id,
    orderId,
    sender: {
      _id: req.user._id || req.user.id,
      id: req.user.id,
      name: req.user.name,
      role: req.user.role,
    },
    text: messageText,
    type: 'text',
    createdAt: savedMsg.timestamp,
  };

  // Broadcast in real-time to all order chat participants
  if (req.io) {
    req.io.to(`order_chat:${orderId}`).emit('receive_order_message', payload);
    req.io.to(`order:${orderId}`).emit('receive_order_message', payload);
    req.io.to(chat._id.toString()).emit('receive_order_message', payload);

    // Notify other participants in their private rooms and push updated unread counts
    const otherParticipants = (chat.participants || []).filter(p => p.toString() !== req.user.id);
    for (const pId of otherParticipants) {
      const pidStr = pId.toString();
      req.io.to(pidStr).emit('new_order_message', payload);
      req.io.to(`user:${pidStr}`).emit('new_order_message', payload);

      calcUnreadMessageCount(pidStr).then(cnt => {
        req.io.to(pidStr).emit('unread_message_count_update', { unreadCount: cnt, count: cnt });
        req.io.to(`user:${pidStr}`).emit('unread_message_count_update', { unreadCount: cnt, count: cnt });
      }).catch(() => {});
    }
  }

  res.status(201).json(payload);
});

/**
 * Helper to compute unread order chat messages count for a user
 */
export async function calcUnreadMessageCount(userId) {
  if (!userId) return 0;
  const uidStr = userId.toString();
  const chats = await Chat.find({
    participants: userId
  }).select('messages').lean();

  let unreadCount = 0;
  for (const c of chats) {
    for (const msg of (c.messages || [])) {
      const senderStr = (msg.sender?._id || msg.sender)?.toString();
      if (!senderStr || senderStr === uidStr) continue;
      const readByArr = (msg.readBy || []).map(r => (r?._id || r)?.toString());
      const hasRead = readByArr.includes(uidStr) || msg.read === true;
      if (!hasRead) {
        unreadCount++;
      }
    }
  }
  return unreadCount;
}

/**
 * @desc    Get total unread order chat messages count for logged-in user
 * @route   GET /api/chat/unread/count
 * @access  Private
 */
export const getUnreadMessagesCount = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const count = await calcUnreadMessageCount(userId);
  res.json({ unreadCount: count, count });
});

/**
 * @desc    Get recent order chats for the logged-in user (for the Messages dropdown)
 * @route   GET /api/chat/recent
 * @access  Private
 */
export const getRecentOrderChats = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;
  const { default: Order } = await import('../models/Order.js');

  const orders = await Order.find({
    $or: [
      { buyer: userId },
      { farmer: userId },
      { deliveryAgent: userId }
    ]
  })
    .populate('buyer', 'name role avatar')
    .populate('farmer', 'name role avatar')
    .populate('deliveryAgent', 'name role avatar')
    .populate('items.listing', 'cropName images')
    .populate({
      path: 'relatedChat',
      populate: {
        path: 'messages.sender',
        select: 'name role avatar'
      }
    })
    .sort({ updatedAt: -1 })
    .limit(25)
    .lean();

  const conversationList = [];

  for (const order of orders) {
    const chat = order.relatedChat;
    const messages = chat?.messages || [];
    const lastMsg = messages[messages.length - 1] || null;

    let unreadInChat = 0;
    messages.forEach(m => {
      const senderId = (m.sender?._id || m.sender)?.toString();
      if (senderId && senderId !== userId.toString()) {
        const readByArr = (m.readBy || []).map(r => (r?._id || r)?.toString());
        const hasRead = readByArr.includes(userId.toString()) || m.read === true;
        if (!hasRead) unreadInChat++;
      }
    });

    const cropName = order.items?.[0]?.cropName || order.items?.[0]?.listing?.cropName || 'Crop Harvest';
    const orderNumber = order.orderNumber || String(order._id).slice(-6).toUpperCase();

    let otherParticipant = null;
    if (order.buyer?._id?.toString() === userId.toString()) {
      otherParticipant = order.farmer || { name: 'Farmer' };
    } else if (order.farmer?._id?.toString() === userId.toString()) {
      otherParticipant = order.buyer || { name: 'Buyer' };
    } else {
      otherParticipant = order.farmer || order.buyer || { name: 'Customer' };
    }

    if (lastMsg || unreadInChat > 0 || ['pending', 'accepted', 'packed', 'shipped'].includes(order.status)) {
      conversationList.push({
        chatId: chat?._id,
        orderId: order._id,
        orderNumber,
        cropName,
        totalAmount: order.totalAmount,
        status: order.status,
        otherParticipant: {
          name: otherParticipant.name,
          role: otherParticipant.role,
          avatar: otherParticipant.avatar,
        },
        buyer: order.buyer,
        farmer: order.farmer,
        deliveryAgent: order.deliveryAgent,
        lastMessage: lastMsg ? {
          text: lastMsg.content || lastMsg.text,
          senderName: lastMsg.sender?.name || (lastMsg.sender?.toString() === userId.toString() ? 'You' : otherParticipant.name),
          timestamp: lastMsg.timestamp || lastMsg.createdAt,
          isSelf: (lastMsg.sender?._id || lastMsg.sender)?.toString() === userId.toString(),
        } : null,
        unreadCount: unreadInChat,
        updatedAt: lastMsg?.timestamp || order.updatedAt,
      });
    }
  }

  conversationList.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json(conversationList);
});

/**
 * @desc    Mark all messages in an order chat as read
 * @route   PUT /api/chat/order/:orderId/read
 * @access  Private
 */
export const markChatAsRead = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id || req.user._id;
  const { default: Order } = await import('../models/Order.js');

  const order = await Order.findById(orderId);
  if (!order || !order.relatedChat) {
    const remaining = await calcUnreadMessageCount(userId);
    return res.json({ message: 'No chat to mark as read', unreadCount: remaining, count: remaining });
  }

  const chat = await Chat.findById(order.relatedChat);
  if (chat) {
    let changed = false;
    chat.messages.forEach(m => {
      const senderId = (m.sender?._id || m.sender)?.toString();
      if (senderId && senderId !== userId.toString()) {
        if (!m.readBy) m.readBy = [];
        const hasRead = m.readBy.some(id => (id?._id || id)?.toString() === userId.toString());
        if (!hasRead) {
          m.readBy.push(userId);
          m.read = true;
          changed = true;
        }
      }
    });
    if (changed) {
      await chat.save();
    }
  }

  const remaining = await calcUnreadMessageCount(userId);
  if (req.io) {
    req.io.to(userId.toString()).emit('unread_message_count_update', { unreadCount: remaining, count: remaining });
    req.io.to(`user:${userId.toString()}`).emit('unread_message_count_update', { unreadCount: remaining, count: remaining });
  }

  res.json({ message: 'Chat marked as read', unreadCount: remaining, count: remaining });
});

/**
 * @desc    Mark all order chats as read for the user
 * @route   PUT /api/chat/all/read
 * @access  Private
 */
export const markAllChatsAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id || req.user._id;

  const chats = await Chat.find({ participants: userId });
  for (const chat of chats) {
    let changed = false;
    chat.messages.forEach(m => {
      const senderId = (m.sender?._id || m.sender)?.toString();
      if (senderId && senderId !== userId.toString()) {
        if (!m.readBy) m.readBy = [];
        const hasRead = m.readBy.some(id => (id?._id || id)?.toString() === userId.toString());
        if (!hasRead) {
          m.readBy.push(userId);
          m.read = true;
          changed = true;
        }
      }
    });
    if (changed) {
      await chat.save();
    }
  }

  if (req.io) {
    req.io.to(userId.toString()).emit('unread_message_count_update', { unreadCount: 0, count: 0 });
    req.io.to(`user:${userId.toString()}`).emit('unread_message_count_update', { unreadCount: 0, count: 0 });
  }

  res.json({ message: 'All order chats marked as read', unreadCount: 0, count: 0 });
});

/**
 * @desc    Send a message in a general chat
 * @route   POST /api/chat/:chatId/message
 * @access  Private
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: 'Message content is required' });
  }

  const chat = await Chat.findById(chatId);
  if (!chat) {
    return res.status(404).json({ message: 'Chat not found' });
  }

  // Verify user belongs to the chat
  const isParticipant = chat.participants.some(p => p.toString() === req.user.id);
  if (!isParticipant) {
    return res.status(403).json({ message: 'Not authorized to send messages in this chat' });
  }

  // Append user message
  const userMessage = {
    sender: req.user.id,
    type: 'text',
    content,
    timestamp: new Date(),
  };
  chat.messages.push(userMessage);
  await chat.save();

  // Populate for response
  const populatedChat = await Chat.findById(chatId)
    .populate('participants', 'name avatar location role')
    .populate('messages.sender', 'name avatar role');

  const lastMsg = populatedChat.messages[populatedChat.messages.length - 1];

  const formattedMsg = {
    _id: lastMsg._id,
    sender: {
      _id: req.user.id,
      name: req.user.name,
      role: req.user.role,
    },
    text: content,
    type: 'text',
    createdAt: lastMsg.timestamp || new Date(),
  };

  // Emit real-time update via Socket.io if available
  if (req.io) {
    req.io.to(chatId).emit('receive_order_message', formattedMsg);
    req.io.to(`chat:${chatId}`).emit('receive_order_message', formattedMsg);
    req.io.to(chatId).emit('new_message', { chatId, messages: populatedChat.messages });
  }

  res.json({ message: formattedMsg, chat: populatedChat });
});

