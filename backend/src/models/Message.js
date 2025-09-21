const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true,
    maxlength: 2000
  },
  chatroom: {
    type: String,
    required: true,
    default: 'general'
  },
  messageType: {
    type: String,
    enum: ['public', 'private'],
    default: 'public'
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return this.messageType === 'private'; }
  },
  recipientUsername: {
    type: String,
    required: function() { return this.messageType === 'private'; }
  },
  analysis: {
    abuse_detected: {
      type: Boolean,
      default: false
    },
    abuse_type: {
      type: String,
      enum: ['harassment', 'bullying', 'hate_speech', 'threats', 'spam', 'sexual_content', 'none'],
      default: 'none'
    },
    confidence_score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    emotion: {
      type: String,
      enum: ['anger', 'joy', 'sadness', 'fear', 'disgust', 'surprise', 'neutral'],
      default: 'neutral'
    },
    emotion_intensity: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    secondary_emotions: [{
      emotion: {
        type: String,
        enum: ['anger', 'joy', 'sadness', 'fear', 'disgust', 'surprise', 'neutral']
      },
      intensity: {
        type: Number,
        min: 0,
        max: 100
      }
    }],
    processed_at: {
      type: Date,
      default: Date.now
    }
  },
  metadata: {
    ip_address: String,
    user_agent: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    edited: {
      type: Boolean,
      default: false
    },
    edited_at: Date
  },
  status: {
    type: String,
    enum: ['active', 'flagged', 'hidden', 'deleted'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
messageSchema.index({ userId: 1 });
messageSchema.index({ chatroom: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ 'analysis.abuse_detected': 1 });
messageSchema.index({ 'analysis.emotion': 1 });
messageSchema.index({ status: 1 });
messageSchema.index({ messageType: 1 });
messageSchema.index({ recipientId: 1 });

// Compound indexes for common queries
messageSchema.index({ chatroom: 1, createdAt: -1 });
messageSchema.index({ userId: 1, createdAt: -1 });
messageSchema.index({ 'analysis.abuse_detected': 1, createdAt: -1 });
messageSchema.index({ userId: 1, recipientId: 1, createdAt: -1 }); // For direct messages
messageSchema.index({ messageType: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);