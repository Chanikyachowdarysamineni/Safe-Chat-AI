const { body, validationResult } = require('express-validator');

const validateMessage = [
  body('text')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message text must be between 1 and 2000 characters'),
  body('chatroom')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Chatroom name must be between 1 and 50 characters'),
];

const validateUser = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const validateFlag = [
  body('reason')
    .isIn(['harassment', 'bullying', 'hate_speech', 'threats', 'spam', 'sexual_content', 'inappropriate_emotion', 'other'])
    .withMessage('Invalid flag reason'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('severity')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity level'),
];

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  validateMessage,
  validateUser,
  validateLogin,
  validateFlag,
  handleValidationErrors
};