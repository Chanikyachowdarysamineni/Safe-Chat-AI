const express = require('express');
const Flag = require('../models/Flag');
const Message = require('../models/Message');
const User = require('../models/User');
const { moderatorAuth, adminAuth } = require('../middleware/auth');
const { validateFlag, handleValidationErrors } = require('../middleware/validation');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/flags
// @desc    Get flags with filtering and pagination
// @access  Private (Moderator)
router.get('/', moderatorAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      severity,
      flagType,
      reason,
      start_date,
      end_date
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (flagType) filter.flagType = flagType;
    if (reason) filter.reason = reason;
    
    if (start_date || end_date) {
      filter.createdAt = {};
      if (start_date) filter.createdAt.$gte = new Date(start_date);
      if (end_date) filter.createdAt.$lte = new Date(end_date);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get flags
    const flags = await Flag.find(filter)
      .populate('messageId', 'text chatroom analysis createdAt')
      .populate('userId', 'username email role')
      .populate('moderatorId', 'username email')
      .populate('reviewed_by', 'username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Flag.countDocuments(filter);

    res.json({
      success: true,
      data: {
        flags,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get flags error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/flags
// @desc    Create a manual flag
// @access  Private (Moderator)
router.post('/', moderatorAuth, validateFlag, handleValidationErrors, async (req, res) => {
  try {
    const { messageId, reason, description, severity } = req.body;

    // Check if message exists
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if already flagged
    const existingFlag = await Flag.findOne({ messageId, status: { $ne: 'dismissed' } });
    if (existingFlag) {
      return res.status(400).json({
        success: false,
        message: 'Message is already flagged'
      });
    }

    // Create flag
    const flag = new Flag({
      messageId,
      userId: message.userId,
      moderatorId: req.user._id,
      flagType: 'manual',
      reason,
      description,
      severity,
      metadata: {
        chatroom: message.chatroom,
        user_previous_flags: await Flag.countDocuments({ userId: message.userId })
      }
    });

    await flag.save();

    // Update message status
    message.status = 'flagged';
    await message.save();

    // Update user stats
    await User.findByIdAndUpdate(message.userId, {
      $inc: { 'stats.flaggedMessages': 1 }
    });

    // Emit to moderators
    const io = req.app.get('io');
    io.to('moderators').emit('flag-created', {
      flag: flag.toObject(),
      message: message.toObject(),
      flaggedBy: req.user.username
    });

    res.status(201).json({
      success: true,
      message: 'Flag created successfully',
      data: flag
    });
  } catch (error) {
    logger.error('Create flag error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/flags/:id/review
// @desc    Review a flag
// @access  Private (Moderator)
router.put('/:id/review', moderatorAuth, async (req, res) => {
  try {
    const { status, action_taken, reviewer_notes } = req.body;

    if (!['reviewed', 'dismissed', 'escalated'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    if (action_taken && !['none', 'warning', 'timeout', 'ban', 'message_removal', 'account_suspension'].includes(action_taken)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action'
      });
    }

    const flag = await Flag.findById(req.params.id)
      .populate('messageId')
      .populate('userId');

    if (!flag) {
      return res.status(404).json({
        success: false,
        message: 'Flag not found'
      });
    }

    // Update flag
    flag.status = status;
    flag.action_taken = action_taken || 'none';
    flag.reviewer_notes = reviewer_notes;
    flag.reviewed_by = req.user._id;
    flag.reviewed_at = new Date();

    await flag.save();

    // Take action if specified
    if (action_taken && action_taken !== 'none') {
      await takeModeratorAction(flag, action_taken, req.user._id);
    }

    // Emit to moderators
    const io = req.app.get('io');
    io.to('moderators').emit('flag-reviewed', {
      flagId: flag._id,
      status,
      action_taken,
      reviewedBy: req.user.username
    });

    res.json({
      success: true,
      message: 'Flag reviewed successfully',
      data: flag
    });
  } catch (error) {
    logger.error('Review flag error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/flags/stats
// @desc    Get flag statistics
// @access  Private (Moderator)
router.get('/stats', moderatorAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const dateFilter = {};
    if (start_date || end_date) {
      dateFilter.createdAt = {};
      if (start_date) dateFilter.createdAt.$gte = new Date(start_date);
      if (end_date) dateFilter.createdAt.$lte = new Date(end_date);
    }

    const stats = await Flag.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          total_flags: { $sum: 1 },
          pending_flags: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          reviewed_flags: {
            $sum: { $cond: [{ $eq: ['$status', 'reviewed'] }, 1, 0] }
          },
          dismissed_flags: {
            $sum: { $cond: [{ $eq: ['$status', 'dismissed'] }, 1, 0] }
          },
          auto_flags: {
            $sum: { $cond: [{ $eq: ['$flagType', 'auto'] }, 1, 0] }
          },
          manual_flags: {
            $sum: { $cond: [{ $eq: ['$flagType', 'manual'] }, 1, 0] }
          }
        }
      }
    ]);

    const severityStats = await Flag.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    const reasonStats = await Flag.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$reason',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          total_flags: 0,
          pending_flags: 0,
          reviewed_flags: 0,
          dismissed_flags: 0,
          auto_flags: 0,
          manual_flags: 0
        },
        by_severity: severityStats,
        by_reason: reasonStats
      }
    });
  } catch (error) {
    logger.error('Get flag stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Helper function to take moderator actions
async function takeModeratorAction(flag, action, moderatorId) {
  try {
    switch (action) {
      case 'warning':
        // Send warning to user (implement notification system)
        await User.findByIdAndUpdate(flag.userId, {
          $inc: { 'stats.warningsReceived': 1 }
        });
        break;

      case 'message_removal':
        await Message.findByIdAndUpdate(flag.messageId, {
          status: 'deleted'
        });
        break;

      case 'timeout':
        // Implement timeout logic (temporary ban)
        await User.findByIdAndUpdate(flag.userId, {
          isActive: false,
          // Add timeout expiry logic
        });
        break;

      case 'ban':
      case 'account_suspension':
        await User.findByIdAndUpdate(flag.userId, {
          isActive: false
        });
        break;
    }

    logger.info(`Moderator action taken: ${action} by ${moderatorId} for flag ${flag._id}`);
  } catch (error) {
    logger.error('Moderator action error:', error);
  }
}

module.exports = router;