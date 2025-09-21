const mongoose = require('mongoose');

const flagSchema = new mongoose.Schema({
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  moderatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null means auto-flagged by AI
  },
  flagType: {
    type: String,
    enum: ['auto', 'manual', 'user_report'],
    required: true
  },
  reason: {
    type: String,
    enum: ['harassment', 'bullying', 'hate_speech', 'threats', 'spam', 'sexual_content', 'inappropriate_emotion', 'other'],
    required: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'dismissed', 'escalated'],
    default: 'pending'
  },
  action_taken: {
    type: String,
    enum: ['none', 'warning', 'timeout', 'ban', 'message_removal', 'account_suspension'],
    default: 'none'
  },
  ai_confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  reviewer_notes: {
    type: String,
    maxlength: 1000
  },
  reviewed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewed_at: {
    type: Date,
    default: null
  },
  escalated_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  escalated_at: {
    type: Date,
    default: null
  },
  metadata: {
    chatroom: String,
    user_previous_flags: Number,
    emotion_trigger: String,
    intensity_threshold_exceeded: Boolean
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
flagSchema.index({ messageId: 1 });
flagSchema.index({ userId: 1 });
flagSchema.index({ moderatorId: 1 });
flagSchema.index({ status: 1 });
flagSchema.index({ severity: 1 });
flagSchema.index({ createdAt: -1 });
flagSchema.index({ flagType: 1 });

// Compound indexes for common queries
flagSchema.index({ status: 1, severity: 1, createdAt: -1 });
flagSchema.index({ userId: 1, status: 1 });
flagSchema.index({ moderatorId: 1, status: 1 });

module.exports = mongoose.model('Flag', flagSchema);