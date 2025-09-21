const express = require('express');
const Message = require('../models/Message');
const Flag = require('../models/Flag');
const User = require('../models/User');
const { moderatorAuth } = require('../middleware/auth');
const mlService = require('../services/mlService');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview statistics
// @access  Private (Moderator)
router.get('/overview', moderatorAuth, async (req, res) => {
  try {
    const { timeframe = '24h' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '1h':
        startDate = new Date(now - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 24 * 60 * 60 * 1000);
    }

    // Get overview statistics
    const [messageStats, flagStats, userStats, mlStatus] = await Promise.all([
      // Message statistics
      Message.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
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
      ]),

      // Flag statistics
      Flag.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: null,
            total_flags: { $sum: 1 },
            pending_flags: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            auto_flags: {
              $sum: { $cond: [{ $eq: ['$flagType', 'auto'] }, 1, 0] }
            }
          }
        }
      ]),

      // User statistics
      User.aggregate([
        {
          $group: {
            _id: null,
            total_users: { $sum: 1 },
            active_users: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            },
            moderators: {
              $sum: { $cond: [{ $eq: ['$role', 'moderator'] }, 1, 0] }
            }
          }
        }
      ]),

      // ML service status
      mlService.healthCheck()
    ]);

    res.json({
      success: true,
      data: {
        timeframe,
        messages: messageStats[0] || {
          total_messages: 0,
          flagged_messages: 0,
          avg_emotion_intensity: 0
        },
        flags: flagStats[0] || {
          total_flags: 0,
          pending_flags: 0,
          auto_flags: 0
        },
        users: userStats[0] || {
          total_users: 0,
          active_users: 0,
          moderators: 0
        },
        ml_service: {
          status: mlStatus ? 'online' : 'offline',
          last_check: new Date()
        }
      }
    });
  } catch (error) {
    logger.error('Get dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/dashboard/emotions
// @desc    Get emotion analytics
// @access  Private (Moderator)
router.get('/emotions', moderatorAuth, async (req, res) => {
  try {
    const { timeframe = '24h', chatroom } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (timeframe) {
      case '1h':
        startDate = new Date(now - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now - 24 * 60 * 60 * 1000);
    }

    const matchFilter = { createdAt: { $gte: startDate } };
    if (chatroom) matchFilter.chatroom = chatroom;

    // Emotion distribution
    const emotionDistribution = await Message.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$analysis.emotion',
          count: { $sum: 1 },
          avg_intensity: { $avg: '$analysis.emotion_intensity' },
          max_intensity: { $max: '$analysis.emotion_intensity' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Emotion trends over time
    const emotionTrends = await Message.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: timeframe === '1h' ? '%Y-%m-%d %H:00' : '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            emotion: '$analysis.emotion'
          },
          count: { $sum: 1 },
          avg_intensity: { $avg: '$analysis.emotion_intensity' }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // High intensity emotions (potential alerts)
    const highIntensityEmotions = await Message.find({
      ...matchFilter,
      'analysis.emotion_intensity': { $gte: 80 },
      'analysis.emotion': { $in: ['anger', 'fear', 'disgust'] }
    })
    .populate('userId', 'username')
    .select('text chatroom analysis.emotion analysis.emotion_intensity createdAt')
    .sort({ createdAt: -1 })
    .limit(10);

    res.json({
      success: true,
      data: {
        distribution: emotionDistribution,
        trends: emotionTrends,
        high_intensity_alerts: highIntensityEmotions,
        timeframe
      }
    });
  } catch (error) {
    logger.error('Get emotion analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/dashboard/abuse-trends
// @desc    Get abuse detection trends
// @access  Private (Moderator)
router.get('/abuse-trends', moderatorAuth, async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;

    const now = new Date();
    let startDate;
    let groupFormat;
    
    switch (timeframe) {
      case '24h':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        groupFormat = '%Y-%m-%d %H:00';
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        groupFormat = '%Y-%m-%d';
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        groupFormat = '%Y-%m-%d';
        break;
      default:
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        groupFormat = '%Y-%m-%d';
    }

    // Abuse detection trends
    const abuseTrends = await Message.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: {
              $dateToString: {
                format: groupFormat,
                date: '$createdAt'
              }
            },
            abuse_detected: '$analysis.abuse_detected'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    // Abuse categories
    const abuseCategories = await Message.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate },
          'analysis.abuse_detected': true
        } 
      },
      {
        $group: {
          _id: '$analysis.abuse_type',
          count: { $sum: 1 },
          avg_confidence: { $avg: '$analysis.confidence_score' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        trends: abuseTrends,
        categories: abuseCategories,
        timeframe
      }
    });
  } catch (error) {
    logger.error('Get abuse trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/dashboard/real-time
// @desc    Get real-time dashboard data
// @access  Private (Moderator)
router.get('/real-time', moderatorAuth, async (req, res) => {
  try {
    // Get recent messages (last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    const recentMessages = await Message.find({
      createdAt: { $gte: tenMinutesAgo }
    })
    .populate('userId', 'username')
    .select('text chatroom analysis createdAt')
    .sort({ createdAt: -1 })
    .limit(20);

    // Get pending flags
    const pendingFlags = await Flag.find({ status: 'pending' })
      .populate('messageId', 'text chatroom')
      .populate('userId', 'username')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get active users (those who sent messages in last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const activeUsers = await Message.distinct('userId', {
      createdAt: { $gte: oneHourAgo }
    });

    // Get chatroom activity
    const chatroomActivity = await Message.aggregate([
      { $match: { createdAt: { $gte: oneHourAgo } } },
      {
        $group: {
          _id: '$chatroom',
          message_count: { $sum: 1 },
          unique_users: { $addToSet: '$userId' },
          flagged_messages: {
            $sum: { $cond: [{ $eq: ['$analysis.abuse_detected', true] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          chatroom: '$_id',
          message_count: 1,
          unique_users: { $size: '$unique_users' },
          flagged_messages: 1
        }
      },
      { $sort: { message_count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        recent_messages: recentMessages,
        pending_flags: pendingFlags,
        active_users_count: activeUsers.length,
        chatroom_activity: chatroomActivity,
        last_updated: new Date()
      }
    });
  } catch (error) {
    logger.error('Get real-time data error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;