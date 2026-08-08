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
 * @desc    Send a message in a chat and get AI response (placeholder)
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
  };
  chat.messages.push(userMessage);

  // Call Gemini via aiService for real AI response
  let aiReply;
  try {
    const { chatResponse } = await import('../services/aiService.js');
    aiReply = await chatResponse(content, req.user.lang || 'en');
  } catch (error) {
    console.error('Gemini chat error:', error);
    // Fallback generic response
    aiReply = "I'm KisanMitra, your AI assistant. How can I help you today?";
  }
  const aiMessage = {
    sender: null, // system/assistant
    type: 'text',
    content: aiReply,
  };
  chat.messages.push(aiMessage);

  await chat.save();

  // Populate for response
  const populatedChat = await Chat.findById(chatId)
    .populate('participants', 'name avatar location')
    .populate('messages.sender', 'name avatar');

  // Emit real‑time update via Socket.io if available
  if (req.io) {
    req.io.to(chatId).emit('new_message', { chatId, messages: populatedChat.messages });
  }

  res.json({ chat: populatedChat });
});
