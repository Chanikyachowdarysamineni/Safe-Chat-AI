const logger = require('../utils/logger');
const MockMLService = require('./mockMLService');

// Use mock ML service for demo purposes
const USE_MOCK_ML = process.env.USE_MOCK_ML !== 'false';

class MLService {
  constructor() {
    if (USE_MOCK_ML) {
      this.mockService = new MockMLService();
      logger.info('Using Mock ML Service for demonstration');
    } else {
      const axios = require('axios');
      this.baseURL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
      this.timeout = 10000;
      this.axios = axios;
    }
  }

  async analyzeText(text) {
    if (USE_MOCK_ML) {
      try {
        const result = this.mockService.analyzeText(text);
        // Convert mock format to expected format
        return {
          abuse_detected: result.abuse_detection.is_abusive,
          abuse_type: result.abuse_detection.abuse_type || 'none',
          confidence_score: result.abuse_detection.confidence,
          emotion: result.emotion_analysis.primary_emotion.emotion,
          emotion_intensity: result.emotion_analysis.primary_emotion.intensity,
          secondary_emotions: result.emotion_analysis.secondary_emotions.map(e => ({
            emotion: e.emotion,
            intensity: e.intensity
          })),
          processed_at: new Date(),
          raw_analysis: result
        };
      } catch (error) {
        logger.error('Mock ML Service error:', error.message);
        return this.getDefaultAnalysis();
      }
    }

    try {
      const response = await this.axios.post(`${this.baseURL}/analyze`, {
        text: text
      }, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('ML Service error:', error.message);
      return this.getDefaultAnalysis();
    }
  }

  getDefaultAnalysis() {
    return {
      abuse_detected: false,
      abuse_type: 'none',
      confidence_score: 0,
      emotion: 'neutral',
      emotion_intensity: 0,
      secondary_emotions: [],
      processed_at: new Date(),
      error: 'ML service unavailable'
    };
  }

  async batchAnalyze(texts) {
    if (USE_MOCK_ML) {
      try {
        const results = this.mockService.analyzeBatch(texts);
        return results.map(result => ({
          abuse_detected: result.abuse_detection.is_abusive,
          abuse_type: result.abuse_detection.abuse_type || 'none',
          confidence_score: result.abuse_detection.confidence,
          emotion: result.emotion_analysis.primary_emotion.emotion,
          emotion_intensity: result.emotion_analysis.primary_emotion.intensity,
          secondary_emotions: result.emotion_analysis.secondary_emotions.map(e => ({
            emotion: e.emotion,
            intensity: e.intensity
          })),
          processed_at: new Date(),
          raw_analysis: result
        }));
      } catch (error) {
        logger.error('Mock ML Service batch error:', error.message);
        return texts.map(() => this.getDefaultAnalysis());
      }
    }

    try {
      const response = await this.axios.post(`${this.baseURL}/batch-analyze`, {
        texts: texts
      }, {
        timeout: this.timeout * 2,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('ML Service batch analysis error:', error.message);
      return texts.map(() => this.getDefaultAnalysis());
    }
  }

  async getModelInfo() {
    if (USE_MOCK_ML) {
      return {
        abuse_model: 'mock-abuse-detector-v1.0',
        emotion_model: 'mock-emotion-analyzer-v1.0',
        version: '1.0.0',
        status: 'online',
        type: 'mock'
      };
    }

    try {
      const response = await this.axios.get(`${this.baseURL}/models/info`, {
        timeout: 5000
      });

      return response.data;
    } catch (error) {
      logger.error('ML Service model info error:', error.message);
      return {
        abuse_model: 'unavailable',
        emotion_model: 'unavailable',
        version: 'unknown',
        status: 'offline'
      };
    }
  }

  async healthCheck() {
    if (USE_MOCK_ML) {
      return true; // Mock service is always healthy
    }

    try {
      const response = await this.axios.get(`${this.baseURL}/health`, {
        timeout: 3000
      });

      return response.status === 200;
    } catch (error) {
      logger.error('ML Service health check failed:', error.message);
      return false;
    }
  }
}

module.exports = new MLService();