const express = require('express');
const User = require('../models/User');
const Message = require('../models/Message');
const Flag = require('../models/Flag');
const { auth, moderatorAuth, adminAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/users/chat
// @desc    Get users for chat (limited info for privacy)
// @access  Private
router.get('/chat', auth, async (req, res) => {
  try {
    const { limit = 50, search } = req.query;

    // Build filter object
    const filter = { 
      isActive: true,
      _id: { $ne: req.user._id } // Exclude current user
    };
    
    if (search) {
      filter.username = { $regex: search, $options: 'i' };
    }

    // Get users with limited info for privacy
    const users = await User.find(filter)
      .select('username profile.firstName profile.lastName createdAt lastSeen')
      .sort({ lastSeen: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          total: users.length,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get chat users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/users
// @desc    Get users with filtering and pagination
// @access  Private (Moderator)
router.get('/', moderatorAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      isActive,
      search,
      sort = 'createdAt',
      order = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build sort object
    const sortObj = {};
    sortObj[sort] = order === 'desc' ? -1 : 1;

    // Get users
    const users = await User.find(filter)
      .select('-password')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get a specific user
// @access  Private (Moderator)
router.get('/:id', moderatorAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's recent messages
    const recentMessages = await Message.find({ userId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(10);

    // Get user's flags
    const flags = await Flag.find({ userId: req.params.id })
      .populate('messageId', 'text chatroom')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        user,
        recentMessages,
        flags
      }
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/users/:id/status
// @desc    Update user status (activate/deactivate)
// @access  Private (Admin)
router.put('/:id/status', adminAuth, async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Emit to moderators
    const io = req.app.get('io');
    io.to('moderators').emit('user-status-updated', {
      userId: user._id,
      username: user.username,
      isActive,
      updatedBy: req.user.username
    });

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/users/:id/role
// @desc    Update user role
// @access  Private (Admin)
router.put('/:id/role', adminAuth, async (req, res) => {
  try {
    const { role } = req.body;

    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Emit to moderators
    const io = req.app.get('io');
    io.to('moderators').emit('user-role-updated', {
      userId: user._id,
      username: user.username,
      role,
      updatedBy: req.user.username
    });

    res.json({
      success: true,
      message: 'User role updated successfully',
      data: user
    });
  } catch (error) {
    logger.error('Update user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/users/:id/analytics
// @desc    Get user analytics
// @access  Private (Moderator)
router.get('/:id/analytics', moderatorAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const dateFilter = { userId: req.params.id };
    if (start_date || end_date) {
      dateFilter.createdAt = {};
      if (start_date) dateFilter.createdAt.$gte = new Date(start_date);
      if (end_date) dateFilter.createdAt.$lte = new Date(end_date);
    }

    // Message analytics
    const messageStats = await Message.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          total_messages: { $sum: 1 },
          flagged_messages: {
            $sum: { $cond: [{ $eq: ['$analysis.abuse_detected', true] }, 1, 0] }
          },
          avg_emotion_intensity: { $avg: '$analysis.emotion_intensity' }
        }
      }
    ]);

    // Emotion distribution
    const emotionStats = await Message.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$analysis.emotion',
          count: { $sum: 1 },
          avg_intensity: { $avg: '$analysis.emotion_intensity' }
        }
      }
    ]);

    // Daily activity
    const dailyActivity = await Message.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          message_count: { $sum: 1 },
          flagged_count: {
            $sum: { $cond: [{ $eq: ['$analysis.abuse_detected', true] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: messageStats[0] || {
          total_messages: 0,
          flagged_messages: 0,
          avg_emotion_intensity: 0
        },
        emotion_distribution: emotionStats,
        daily_activity: dailyActivity
      }
    });
  } catch (error) {
    logger.error('Get user analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;