// Mock ML Service for SafeChat AI
// This simulates the Python ML service functionality for demo purposes

class MockMLService {
  constructor() {
    // Mock abuse keywords for detection
    this.abuseKeywords = {
      harassment: ['idiot', 'stupid', 'loser', 'worthless', 'useless'],
      hate_speech: ['hate', 'racist', 'bigot', 'nazi', 'supremacist'],
      threats: ['kill', 'hurt', 'destroy', 'attack', 'violence'],
      bullying: ['weak', 'pathetic', 'nobody', 'freak', 'reject'],
      spam: ['buy now', 'click here', 'free money', 'winner', 'lottery'],
      sexual_content: ['xxx', 'adult', 'explicit', 'sexual', 'inappropriate']
    };

    // Mock emotion keywords
    this.emotionKeywords = {
      anger: ['angry', 'mad', 'furious', 'rage', 'irritated', 'pissed'],
      joy: ['happy', 'excited', 'love', 'great', 'awesome', 'amazing'],
      sadness: ['sad', 'depressed', 'upset', 'crying', 'miserable', 'lonely'],
      fear: ['scared', 'afraid', 'terrified', 'worried', 'anxious', 'panic'],
      surprise: ['wow', 'amazing', 'incredible', 'shocking', 'unexpected'],
      neutral: ['okay', 'fine', 'normal', 'regular', 'standard']
    };
  }

  analyzeText(text) {
    const content = text.toLowerCase();
    
    // Analyze for abuse
    const abuseAnalysis = this.detectAbuse(content);
    
    // Analyze for emotions
    const emotionAnalysis = this.detectEmotion(content);

    return {
      text: text,
      abuse_detection: abuseAnalysis,
      emotion_analysis: emotionAnalysis,
      timestamp: new Date().toISOString()
    };
  }

  detectAbuse(content) {
    let highestConfidence = 0;
    let detectedType = null;
    const categories = {};

    // Check each abuse category
    for (const [type, keywords] of Object.entries(this.abuseKeywords)) {
      let matches = 0;
      let totalKeywords = keywords.length;

      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          matches++;
        }
      }

      const confidence = matches / totalKeywords;
      categories[type] = confidence;

      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        detectedType = type;
      }
    }

    // Add some randomness for more realistic simulation
    if (highestConfidence > 0.1) {
      highestConfidence = Math.min(0.95, highestConfidence + Math.random() * 0.3);
    } else {
      // Random false positives (very low probability)
      if (Math.random() < 0.05) {
        const types = Object.keys(this.abuseKeywords);
        detectedType = types[Math.floor(Math.random() * types.length)];
        highestConfidence = 0.2 + Math.random() * 0.3;
      }
    }

    return {
      is_abusive: highestConfidence > 0.3,
      abuse_type: highestConfidence > 0.3 ? detectedType : null,
      confidence: highestConfidence,
      categories: categories
    };
  }

  detectEmotion(content) {
    let highestIntensity = 0;
    let primaryEmotion = 'neutral';
    const emotionScores = {};

    // Check each emotion category
    for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
      let matches = 0;
      let totalKeywords = keywords.length;

      for (const keyword of keywords) {
        if (content.includes(keyword)) {
          matches++;
        }
      }

      let intensity = matches / totalKeywords;
      
      // Add some randomness for more natural simulation
      intensity = Math.min(1.0, intensity + Math.random() * 0.2);
      
      emotionScores[emotion] = intensity;

      if (intensity > highestIntensity) {
        highestIntensity = intensity;
        primaryEmotion = emotion;
      }
    }

    // If no emotion detected, default to neutral with some intensity
    if (highestIntensity < 0.1) {
      primaryEmotion = 'neutral';
      highestIntensity = 0.3 + Math.random() * 0.4;
      emotionScores.neutral = highestIntensity;
    }

    // Create secondary emotions
    const secondaryEmotions = [];
    for (const [emotion, intensity] of Object.entries(emotionScores)) {
      if (emotion !== primaryEmotion && intensity > 0.2) {
        secondaryEmotions.push({
          emotion: emotion,
          intensity: intensity,
          confidence: 0.7 + Math.random() * 0.3
        });
      }
    }

    return {
      primary_emotion: {
        emotion: primaryEmotion,
        intensity: highestIntensity,
        confidence: 0.8 + Math.random() * 0.2
      },
      secondary_emotions: secondaryEmotions.slice(0, 2), // Max 2 secondary emotions
      all_emotions: emotionScores
    };
  }

  // Batch analysis for multiple texts
  analyzeBatch(texts) {
    return texts.map(text => this.analyzeText(text));
  }

  // Health check
  getHealth() {
    return {
      status: 'healthy',
      service: 'mock-ml-service',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = MockMLService;