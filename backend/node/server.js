import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import dns from 'dns';

// Prefer IPv4 for DNS resolution to avoid MongoDB connection timeouts on IPv6
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// Load environment variables FIRST
dotenv.config();

import connectDB from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';

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

import agriChatRoutes from './routes/agriChatRoutes.js';
import agriChatOrchestrator from './services/agriChat/agriChatOrchestrator.js';
import productVerificationRoutes from './routes/productVerificationRoutes.js';
import { seedAgriData } from './utils/seedAgriData.js';

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// Connect to MongoDB and seed agricultural data
connectDB().then(() => {
  seedAgriData();
});

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

// Attach io to req for use in controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware
app.use(cors({
  origin: CLIENT_URLS,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
app.use('/api/notifications', notificationRoutes);
app.use('/api/product', productVerificationRoutes); // CropVerify AI — report proxy
app.use('/api/schemes', schemeRoutes);
app.use('/api', marketRoutes);

// Socket.io handlers
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
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

