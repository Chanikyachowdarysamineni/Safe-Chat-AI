const express = require('express');
const Message = require('../models/Message');
const Flag = require('../models/Flag');
const { auth, moderatorAuth } = require('../middleware/auth');
const { validateMessage, handleValidationErrors } = require('../middleware/validation');
const mlService = require('../services/mlService');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/messages
// @desc    Get messages with filtering and pagination
// @access  Private (Moderator)
router.get('/', moderatorAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      chatroom,
      userId,
      flagged,
      emotion,
      abuse_type,
      start_date,
      end_date
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (chatroom) filter.chatroom = chatroom;
    if (userId) filter.userId = userId;
    if (flagged === 'true') filter['analysis.abuse_detected'] = true;
    if (emotion) filter['analysis.emotion'] = emotion;
    if (abuse_type) filter['analysis.abuse_type'] = abuse_type;
    
    if (start_date || end_date) {
      filter.createdAt = {};
      if (start_date) filter.createdAt.$gte = new Date(start_date);
      if (end_date) filter.createdAt.$lte = new Date(end_date);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get messages
    const messages = await Message.find(filter)
      .populate('userId', 'username email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments(filter);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/messages
// @desc    Create a new message and analyze it
// @access  Private
router.post('/', auth, validateMessage, handleValidationErrors, async (req, res) => {
  try {
    const { text, chatroom = 'general', recipientId, messageType = 'public' } = req.body;

    // Validate private message requirements
    if (messageType === 'private' && !recipientId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient ID is required for private messages'
      });
    }

    let recipientUser = null;
    if (messageType === 'private') {
      recipientUser = await require('../models/User').findById(recipientId);
      if (!recipientUser) {
        return res.status(404).json({
          success: false,
          message: 'Recipient not found'
        });
      }
    }

    // Create message
    const message = new Message({
      userId: req.user._id,
      username: req.user.username,
      text,
      chatroom,
      messageType,
      ...(messageType === 'private' && {
        recipientId,
        recipientUsername: recipientUser.username
      }),
      metadata: {
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      }
    });

    // Analyze message with ML service
    try {
      const analysis = await mlService.analyzeText(text);
      message.analysis = analysis;

      // Auto-flag if abuse detected with high confidence
      if (analysis.abuse_detected && analysis.confidence_score > 70) {
        const flag = new Flag({
          messageId: message._id,
          userId: req.user._id,
          flagType: 'auto',
          reason: analysis.abuse_type,
          severity: analysis.confidence_score > 90 ? 'high' : 'medium',
          ai_confidence: analysis.confidence_score,
          metadata: {
            chatroom,
            emotion_trigger: analysis.emotion,
            intensity_threshold_exceeded: analysis.emotion_intensity > 80
          }
        });

        await flag.save();
        message.status = 'flagged';

        // Emit to moderators via Socket.IO
        const io = req.app.get('io');
        io.to('moderators').emit('message-flagged', {
          message: message.toObject(),
          flag: flag.toObject(),
          user: {
            id: req.user._id,
            username: req.user.username
          }
        });
      }
    } catch (mlError) {
      logger.error('ML analysis error:', mlError);
      // Continue without analysis if ML service fails
    }

    await message.save();

    // Update user stats
    await require('../models/User').findByIdAndUpdate(req.user._id, {
      $inc: { 'stats.totalMessages': 1 }
    });

    // Emit message to real-time listeners
    const io = req.app.get('io');
    
    if (messageType === 'private') {
      // Send to sender and recipient only
      io.to(req.user._id.toString()).emit('new-message', {
        message: message.toObject(),
        user: {
          id: req.user._id,
          username: req.user.username
        }
      });
      
      io.to(recipientId).emit('new-message', {
        message: message.toObject(),
        user: {
          id: req.user._id,
          username: req.user.username
        }
      });
    } else {
      // Broadcast to all users for public messages
      io.emit('new-message', {
        message: message.toObject(),
        user: {
          id: req.user._id,
          username: req.user.username
        }
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message created successfully',
      data: message
    });
  } catch (error) {
    logger.error('Create message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/messages/:id
// @desc    Get a specific message
// @access  Private (Moderator)
router.get('/:id', moderatorAuth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('userId', 'username email role profile');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    logger.error('Get message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/messages/:id/status
// @desc    Update message status
// @access  Private (Moderator)
router.put('/:id/status', moderatorAuth, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'flagged', 'hidden', 'deleted'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Emit status update
    const io = req.app.get('io');
    io.to('moderators').emit('message-status-updated', {
      messageId: message._id,
      status,
      updatedBy: req.user.username
    });

    res.json({
      success: true,
      message: 'Message status updated',
      data: message
    });
  } catch (error) {
    logger.error('Update message status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/messages/:id/reanalyze
// @desc    Re-analyze a message
// @access  Private (Moderator)
router.post('/:id/reanalyze', moderatorAuth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Re-analyze with ML service
    const analysis = await mlService.analyzeText(message.text);
    message.analysis = analysis;
    message.analysis.processed_at = new Date();

    await message.save();

    res.json({
      success: true,
      message: 'Message re-analyzed successfully',
      data: message
    });
  } catch (error) {
    logger.error('Re-analyze message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;