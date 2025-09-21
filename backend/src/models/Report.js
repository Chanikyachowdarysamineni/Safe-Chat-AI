const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'custom', 'incident'],
    required: true
  },
  date_range: {
    start_date: {
      type: Date,
      required: true
    },
    end_date: {
      type: Date,
      required: true
    }
  },
  statistics: {
    total_messages: {
      type: Number,
      default: 0
    },
    flagged_messages: {
      type: Number,
      default: 0
    },
    abuse_detection_rate: {
      type: Number,
      default: 0
    },
    top_emotions: [{
      emotion: String,
      count: Number,
      percentage: Number
    }],
    abuse_categories: [{
      category: String,
      count: Number,
      percentage: Number
    }],
    user_statistics: {
      total_active_users: Number,
      flagged_users: Number,
      repeat_offenders: Number
    },
    chatroom_statistics: [{
      chatroom: String,
      total_messages: Number,
      flagged_messages: Number,
      dominant_emotion: String
    }]
  },
  trends: {
    emotion_trends: [{
      date: Date,
      emotions: {
        anger: Number,
        joy: Number,
        sadness: Number,
        fear: Number,
        disgust: Number,
        surprise: Number,
        neutral: Number
      }
    }],
    abuse_trends: [{
      date: Date,
      abuse_count: Number,
      categories: {
        harassment: Number,
        bullying: Number,
        hate_speech: Number,
        threats: Number,
        spam: Number,
        sexual_content: Number
      }
    }]
  },
  generated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['generating', 'completed', 'failed'],
    default: 'generating'
  },
  file_path: {
    type: String,
    default: null
  },
  export_format: {
    type: String,
    enum: ['json', 'csv', 'pdf'],
    default: 'json'
  },
  metadata: {
    generation_time_ms: Number,
    data_sources: [String],
    filters_applied: mongoose.Schema.Types.Mixed
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
reportSchema.index({ type: 1 });
reportSchema.index({ generated_by: 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ status: 1 });
reportSchema.index({ 'date_range.start_date': 1, 'date_range.end_date': 1 });

module.exports = mongoose.model('Report', reportSchema);