import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, pipeline
import numpy as np
import logging
import os
from typing import Dict, List
import asyncio

logger = logging.getLogger(__name__)

class EmotionAnalyzer:
    def __init__(self):
        self.model_name = os.getenv("EMOTION_MODEL_NAME", "j-hartmann/emotion-english-distilroberta-base")
        self.model = None
        self.tokenizer = None
        self.classifier = None
        self.emotion_labels = ["anger", "disgust", "fear", "joy", "neutral", "sadness", "surprise"]
        
    async def load_model(self):
        """Load the emotion analysis model"""
        try:
            logger.info(f"Loading emotion model: {self.model_name}")
            
            # Load model and tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                cache_dir=os.getenv("MODEL_CACHE_DIR", "./models/cache")
            )
            
            self.model = AutoModelForSequenceClassification.from_pretrained(
                self.model_name,
                cache_dir=os.getenv("MODEL_CACHE_DIR", "./models/cache")
            )
            
            # Create pipeline
            self.classifier = pipeline(
                "text-classification",
                model=self.model,
                tokenizer=self.tokenizer,
                return_all_scores=True,
                device=0 if torch.cuda.is_available() and os.getenv("USE_GPU", "False").lower() == "true" else -1
            )
            
            logger.info("Emotion model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load emotion model: {e}")
            raise e
    
    async def analyze(self, text: str) -> Dict:
        """Analyze emotion in text"""
        try:
            if not self.classifier:
                raise Exception("Model not loaded")
            
            # Run inference in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(None, self.classifier, text)
            
            # Process results
            emotion_scores = {}
            for result in results[0]:  # results is a list with one element
                emotion = result['label'].lower()
                score = result['score'] * 100  # Convert to percentage
                emotion_scores[emotion] = score
            
            # Find primary emotion
            primary_emotion = max(emotion_scores, key=emotion_scores.get)
            primary_intensity = emotion_scores[primary_emotion]
            
            # Get secondary emotions (scores > 10%)
            secondary_emotions = []
            for emotion, score in emotion_scores.items():
                if emotion != primary_emotion and score > 10:
                    secondary_emotions.append({
                        "emotion": emotion,
                        "intensity": round(score, 2)
                    })
            
            # Sort secondary emotions by intensity
            secondary_emotions.sort(key=lambda x: x['intensity'], reverse=True)
            
            return {
                "emotion": primary_emotion,
                "intensity": round(primary_intensity, 2),
                "secondary_emotions": secondary_emotions[:3],  # Top 3 secondary emotions
                "all_scores": {k: round(v, 2) for k, v in emotion_scores.items()}
            }
            
        except Exception as e:
            logger.error(f"Error analyzing emotion: {e}")
            return {
                "emotion": "neutral",
                "intensity": 0,
                "secondary_emotions": [],
                "all_scores": {},
                "error": str(e)
            }

class AbuseDetector:
    def __init__(self):
        self.model_name = os.getenv("ABUSE_MODEL_NAME", "unitary/toxic-bert")
        self.model = None
        self.tokenizer = None
        self.classifier = None
        self.abuse_types = ["harassment", "bullying", "hate_speech", "threats", "spam", "sexual_content"]
        
        # Thresholds for different abuse types
        self.thresholds = {
            "harassment": 0.7,
            "hate_speech": 0.8,
            "threats": 0.75,
            "sexual_content": 0.65,
            "bullying": 0.7,
            "spam": 0.6
        }
        
    async def load_model(self):
        """Load the abuse detection model"""
        try:
            logger.info(f"Loading abuse detection model: {self.model_name}")
            
            # Load model and tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_name,
                cache_dir=os.getenv("MODEL_CACHE_DIR", "./models/cache")
            )
            
            self.model = AutoModelForSequenceClassification.from_pretrained(
                self.model_name,
                cache_dir=os.getenv("MODEL_CACHE_DIR", "./models/cache")
            )
            
            # Create pipeline for toxicity detection
            self.classifier = pipeline(
                "text-classification",
                model=self.model,
                tokenizer=self.tokenizer,
                return_all_scores=True,
                device=0 if torch.cuda.is_available() and os.getenv("USE_GPU", "False").lower() == "true" else -1
            )
            
            logger.info("Abuse detection model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load abuse detection model: {e}")
            raise e
    
    async def analyze(self, text: str) -> Dict:
        """Analyze text for abuse"""
        try:
            if not self.classifier:
                raise Exception("Model not loaded")
            
            # Run inference in thread pool
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(None, self.classifier, text)
            
            # Extract toxicity score
            toxicity_score = 0
            for result in results[0]:
                if result['label'] == 'TOXIC':
                    toxicity_score = result['score']
                    break
            
            # Determine abuse type based on keywords and patterns
            abuse_type = await self._classify_abuse_type(text, toxicity_score)
            
            # Check if abuse is detected
            confidence_score = toxicity_score * 100
            threshold = self.thresholds.get(abuse_type, 0.7)
            abuse_detected = toxicity_score > threshold
            
            return {
                "abuse_detected": abuse_detected,
                "abuse_type": abuse_type if abuse_detected else "none",
                "confidence_score": round(confidence_score, 2),
                "toxicity_score": round(toxicity_score, 4),
                "threshold_used": threshold
            }
            
        except Exception as e:
            logger.error(f"Error detecting abuse: {e}")
            return {
                "abuse_detected": False,
                "abuse_type": "none",
                "confidence_score": 0,
                "toxicity_score": 0,
                "threshold_used": 0.7,
                "error": str(e)
            }
    
    async def _classify_abuse_type(self, text: str, toxicity_score: float) -> str:
        """Classify the type of abuse based on text content"""
        text_lower = text.lower()
        
        # Keywords for different abuse types
        hate_speech_keywords = ["hate", "kill", "die", "nazi", "terrorist", racial_slurs_pattern()]
        threat_keywords = ["kill you", "hurt you", "destroy you", "going to get you", "watch out"]
        sexual_keywords = ["sex", "sexual", "nude", "naked", explicit_terms_pattern()]
        harassment_keywords = ["stupid", "idiot", "loser", "pathetic", "worthless"]
        bullying_keywords = ["everyone hates you", "nobody likes you", "you should", "embarrassing"]
        spam_keywords = ["click here", "buy now", "free money", "winner", "congratulations"]
        
        # Count matches for each category
        scores = {
            "hate_speech": sum(1 for keyword in hate_speech_keywords if keyword in text_lower),
            "threats": sum(1 for keyword in threat_keywords if keyword in text_lower),
            "sexual_content": sum(1 for keyword in sexual_keywords if keyword in text_lower),
            "harassment": sum(1 for keyword in harassment_keywords if keyword in text_lower),
            "bullying": sum(1 for keyword in bullying_keywords if keyword in text_lower),
            "spam": sum(1 for keyword in spam_keywords if keyword in text_lower)
        }
        
        # Return the category with highest score, or harassment as default
        if max(scores.values()) > 0:
            return max(scores, key=scores.get)
        else:
            return "harassment"  # Default category for toxic content

def racial_slurs_pattern():
    """Returns pattern for racial slurs - placeholder for actual implementation"""
    # In production, this would contain actual patterns/keywords
    # This is a placeholder to avoid including offensive content
    return "offensive_racial_terms"

def explicit_terms_pattern():
    """Returns pattern for explicit sexual terms - placeholder"""
    # In production, this would contain actual patterns/keywords
    # This is a placeholder to avoid including explicit content
    return "explicit_sexual_terms"