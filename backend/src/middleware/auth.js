const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid.'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Token is not valid.'
    });
  }
};

const moderatorAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'moderator' && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Moderator privileges required.'
        });
      }
      next();
    });
  } catch (error) {
    logger.error('Moderator authentication error:', error);
    res.status(403).json({
      success: false,
      message: 'Access denied.'
    });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.'
        });
      }
      next();
    });
  } catch (error) {
    logger.error('Admin authentication error:', error);
    res.status(403).json({
      success: false,
      message: 'Access denied.'
    });
  }
};

module.exports = {
  auth,
  moderatorAuth,
  adminAuth
};