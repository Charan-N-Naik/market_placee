import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import dns from 'dns';
import mongoose from 'mongoose';

// Prefer IPv4 for DNS resolution to avoid MongoDB connection timeouts on IPv6
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// Load environment variables FIRST
dotenv.config();

// Fail-fast environment variable validation
if (!process.env.JWT_SECRET) {
  console.error('❌ Fatal Startup Error: Missing required environment variable: JWT_SECRET');
  process.exit(1);
}

const missingRazorpayKeys = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'].filter(key => !process.env[key]);
if (missingRazorpayKeys.length > 0) {
  console.warn(`⚠️ Warning: Missing Razorpay environment variable(s): ${missingRazorpayKeys.join(', ')}. Online payments will be unavailable until keys are provided.`);
}

import connectDB from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { warmMarketPriceCache } from './controllers/marketController.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import verificationRoutes from './routes/verificationRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import marketRoutes from './routes/marketRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import schemeRoutes from './routes/schemeRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

import agriChatRoutes from './routes/agriChatRoutes.js';
import assistantRoutes from './routes/assistantRoutes.js';
import agriChatOrchestrator from './services/agriChat/agriChatOrchestrator.js';
import productVerificationRoutes from './routes/productVerificationRoutes.js';
import cropVerificationRoutes from './routes/cropVerificationRoutes.js';
import { seedAgriData } from './utils/seedAgriData.js';
import { initDeliveryScheduler } from './services/deliverySchedulerService.js';
import Order from './models/Order.js';
import User from './models/User.js';
import jwt from 'jsonwebtoken';
import { isUserAuthorizedForOrder } from './controllers/orderController.js';

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Connect to MongoDB and seed agricultural data
connectDB().then(() => {
  seedAgriData();
  initDeliveryScheduler();
  warmMarketPriceCache();
});

import { setNotificationIO } from './services/notificationService.js';

// Setup Socket.io
// Support multiple allowed client origins via comma-separated CLIENT_URLS or single CLIENT_URL
const rawClientUrls = process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5175';
const CLIENT_URLS = rawClientUrls.split(',').map(s => s.trim()).filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URLS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

global.io = io;
setNotificationIO(io);


// Socket.io Authentication Middleware
io.use(async (socket, next) => {
  try {
    let token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token && typeof token === 'string' && token.startsWith('Bearer ')) {
      token = token.slice(7).trim();
    }

    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-passwordHash');
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.user = {
      _id: user._id,
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (err) {
    console.warn(`[Socket Auth] Failed connection for socket ${socket.id}:`, err.message);
    return next(new Error('Authentication error: Invalid or expired token'));
  }
});

// Attach io to req for use in controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Request timing middleware: logs slow requests (>500ms)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 500) {
      console.warn(`[SLOW REQUEST] ${req.method} ${req.originalUrl || req.url} took ${duration}ms (status ${res.statusCode})`);
    }
  });
  next();
});

// Middleware
app.use(compression());
app.use(cors({
  origin: CLIENT_URLS,
  credentials: true,
}));
app.use(express.json({
  limit: '50mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/agri-chat', agriChatRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/product', productVerificationRoutes); // CropVerify AI — report proxy
app.use('/api/crop-verification', cropVerificationRoutes); // Real 3-photo AI verification
app.use('/api/schemes', schemeRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', marketRoutes);

// Socket.io handlers
io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id} (${socket.user?.name}, role: ${socket.user?.role})`);

  // Automatically join authenticated user's private notification rooms
  if (socket.user?._id) {
    const uid = socket.user._id.toString();
    socket.join(uid);
    socket.join(`user:${uid}`);
  }

  socket.on('join_room', async (roomId) => {
    try {
      if (!roomId) return;

      // Guard rooms of the form order:<orderId> or order_chat:<orderId>
      const orderMatch = typeof roomId === 'string' && (roomId.match(/^order:(.+)$/) || roomId.match(/^order_chat:(.+)$/));
      if (orderMatch) {
        const orderId = orderMatch[1];
        const order = await Order.findById(orderId);
        if (!order) {
          socket.emit('error', { message: 'Order not found', roomId });
          return;
        }

        if (!isUserAuthorizedForOrder(order, socket.user)) {
          console.warn(`[Socket] User ${socket.user?.id} (${socket.user?.name}) unauthorized for room ${roomId}`);
          socket.emit('error', { message: 'Not authorized for this order room', roomId });
          return;
        }
      }

      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    } catch (err) {
      console.error('[Socket] Error in join_room:', err);
      socket.emit('error', { message: 'Failed to join room', roomId });
    }
  });

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    console.log(`User ${socket.id} left room ${roomId}`);
  });

  // Real-time Tri-Party Order Chat Handler (Farmer, Buyer, Agent)
  socket.on('send_order_message', async (data) => {
    try {
      const { orderId, text, content } = data || {};
      const messageText = (text || content || '').trim();
      if (!orderId || !messageText) return;

      const order = await Order.findById(orderId);
      if (!order) return;

      if (!isUserAuthorizedForOrder(order, socket.user)) {
        socket.emit('error', { message: 'Not authorized for this order chat', orderId });
        return;
      }

      const Chat = (await import('./models/Chat.js')).default;
      let chat = order.relatedChat ? await Chat.findById(order.relatedChat) : null;
      if (!chat) {
        const participantIds = [order.buyer, order.farmer, order.deliveryAgent].filter(Boolean);
        chat = await Chat.create({
          participants: participantIds.length ? participantIds : [socket.user.id],
          messages: [],
          isGroup: true,
        });
        order.relatedChat = chat._id;
        await order.save();
      }

      const newMsg = {
        sender: socket.user.id,
        type: 'text',
        content: messageText,
        timestamp: new Date(),
        read: false,
        readBy: [socket.user.id],
      };
      chat.messages.push(newMsg);
      await chat.save();

      const lastSaved = chat.messages[chat.messages.length - 1];

      const broadcastPayload = {
        _id: lastSaved._id,
        orderId,
        sender: {
          _id: socket.user.id,
          id: socket.user.id,
          name: socket.user.name,
          role: socket.user.role,
        },
        text: messageText,
        type: 'text',
        createdAt: lastSaved.timestamp,
      };

      io.to(`order_chat:${orderId}`).emit('receive_order_message', broadcastPayload);
      io.to(`order:${orderId}`).emit('receive_order_message', broadcastPayload);
      io.to(chat._id.toString()).emit('receive_order_message', broadcastPayload);

      // Notify other participants in their private rooms and push updated unread counts
      const { calcUnreadMessageCount } = await import('./controllers/chatController.js');
      const otherParticipants = (chat.participants || []).filter(p => p.toString() !== socket.user.id);
      for (const pId of otherParticipants) {
        const pidStr = pId.toString();
        io.to(pidStr).emit('new_order_message', broadcastPayload);
        io.to(`user:${pidStr}`).emit('new_order_message', broadcastPayload);

        calcUnreadMessageCount(pidStr).then(cnt => {
          io.to(pidStr).emit('unread_message_count_update', { unreadCount: cnt, count: cnt });
          io.to(`user:${pidStr}`).emit('unread_message_count_update', { unreadCount: cnt, count: cnt });
        }).catch(() => {});
      }
    } catch (err) {
      console.error('[Socket] Error in send_order_message:', err);
    }
  });

  // Guarded live delivery agent GPS location update
  socket.on('agent_location_update', async (data) => {
    try {
      const { orderId, lat, lng } = data || {};
      if (!orderId || lat === undefined || lng === undefined) return;

      const order = await Order.findById(orderId);
      if (!order) {
        console.warn(`[Socket] Order not found for agent_location_update: ${orderId}`);
        return;
      }

      const assignedAgentId = (order.deliveryAgent?._id || order.deliveryAgent || '').toString();
      const currentUserId = (socket.user?._id || socket.user?.id || '').toString();

      if (!assignedAgentId || assignedAgentId !== currentUserId) {
        console.warn(`[Socket] Location update ignored: User ${currentUserId} is not the assigned deliveryAgent (${assignedAgentId}) for order ${orderId}`);
        return;
      }

      const updatedAt = new Date();
      // Relay to scoped order room
      io.to(`order:${orderId}`).emit('agent_location', {
        orderId,
        lat: Number(lat),
        lng: Number(lng),
        updatedAt,
      });

      // Persist to order document for seamless reload
      await Order.findByIdAndUpdate(orderId, {
        lastKnownAgentLocation: {
          lat: Number(lat),
          lng: Number(lng),
          updatedAt,
        },
      });
    } catch (err) {
      console.error('Socket agent_location_update error:', err);
    }
  });

  // Real-Time Multilingual Agri-Advisory WebSocket Handlers
  socket.on('agri_chat_query', async (data) => {
    try {
      const result = await agriChatOrchestrator.processQuery({
        message: data.message || '',
        voiceAudio: data.voiceAudio || null,
        targetLang: data.lang || 'en',
        sessionId: data.sessionId || socket.id,
        generateAudio: data.generateAudio !== false,
      });
      socket.emit('agri_chat_response', result);
    } catch (err) {
      console.error('Socket agri_chat_query error:', err);
      socket.emit('agri_chat_response', {
        success: false,
        error: 'Error processing agri advisory query',
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Health check
app.get('/api/health', (req, res) => {
  const isConnected = mongoose.connection.readyState === 1;
  res.status(200).json({
    ok: true,
    db: isConnected ? 'connected' : 'disconnected',
    dbName: mongoose.connection.name,
  });
});

app.get('/', (req, res) => {
  res.send('KisanBazaar API is running...');
});

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS origins: ${CLIENT_URLS.join(',')}`);
});

