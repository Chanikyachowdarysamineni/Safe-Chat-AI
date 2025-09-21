const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth');
const messageRoutes = require('./routes/messages');
const flagRoutes = require('./routes/flags');
const userRoutes = require('./routes/users');
const dashboardRoutes = require('./routes/dashboard');

const app = express();
const server = http.createServer(app);

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://10.13.220.106:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Socket.IO setup
const io = socketIo(server, {
  cors: corsOptions
});

// Connect to MongoDB
connectDB();

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors(corsOptions));
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/', limiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/flags', flagRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'SafeChat AI Backend',
    version: '1.0.0'
  });
});

// Socket.IO connection handling
const onlineUsers = new Map(); // Store online users

io.on('connection', (socket) => {
  logger.info(`New client connected: ${socket.id}`);

  // Handle user authentication and join their personal room
  socket.on('authenticate', (userId) => {
    if (userId) {
      socket.userId = userId;
      socket.join(userId); // Join personal room for private messages
      
      // Track online user
      onlineUsers.set(userId, {
        id: userId,
        socketId: socket.id,
        joinedAt: new Date()
      });

      // Broadcast updated online users list
      io.emit('users-online', Array.from(onlineUsers.values()));
      
      // Notify others that user joined
      socket.broadcast.emit('user-joined', { id: userId });
      
      logger.info(`User ${userId} authenticated and joined personal room`);
    }
  });

  // Join moderator room
  socket.on('join-moderator', (moderatorId) => {
    socket.join('moderators');
    logger.info(`Moderator ${moderatorId} joined monitoring room`);
  });

  // Handle chat message analysis request
  socket.on('analyze-message', async (data) => {
    try {
      const { messageId, text, userId, chatroom } = data;
      
      // Emit to ML service for analysis (this will be handled by message routes)
      socket.to('moderators').emit('message-analyzing', { messageId, text, userId, chatroom });
      
    } catch (error) {
      logger.error('Socket message analysis error:', error);
      socket.emit('analysis-error', { error: 'Failed to analyze message' });
    }
  });

  // Handle typing indicators for chat
  socket.on('typing-start', (data) => {
    const { chatroom, username, messageType, recipientId } = data;
    
    if (messageType === 'private' && recipientId) {
      socket.to(recipientId).emit('user-typing', { username, chatroom });
    } else {
      socket.broadcast.emit('user-typing', { username, chatroom });
    }
  });

  socket.on('typing-stop', (data) => {
    const { chatroom, username, messageType, recipientId } = data;
    
    if (messageType === 'private' && recipientId) {
      socket.to(recipientId).emit('user-stopped-typing', { username, chatroom });
    } else {
      socket.broadcast.emit('user-stopped-typing', { username, chatroom });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (socket.userId) {
      // Remove from online users
      onlineUsers.delete(socket.userId);
      
      // Broadcast updated online users list
      io.emit('users-online', Array.from(onlineUsers.values()));
      
      // Notify others that user left
      socket.broadcast.emit('user-left', socket.userId);
      
      logger.info(`User ${socket.userId} disconnected and removed from online users`);
    }
    
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Make io accessible to routes
app.set('io', io);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`SafeChat AI Backend server running on port ${PORT}`);
});

module.exports = app;