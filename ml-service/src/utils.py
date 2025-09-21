import logging
import os
from datetime import datetime

def setup_logging():
    """Setup logging configuration"""
    
    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)
    
    # Configure logging
    log_level = getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper())
    
    logging.basicConfig(
        level=log_level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(f"logs/ml_service_{datetime.now().strftime('%Y%m%d')}.log"),
            logging.StreamHandler()
        ]
    )
    
    logger = logging.getLogger(__name__)
    logger.info("Logging setup complete")
    
    return logger

def validate_text_input(text: str, max_length: int = 2000) -> bool:
    """Validate text input"""
    if not text or not isinstance(text, str):
        return False
    
    if len(text.strip()) == 0:
        return False
        
    if len(text) > max_length:
        return False
        
    return True

def preprocess_text(text: str) -> str:
    """Basic text preprocessing"""
    # Remove excessive whitespace
    text = ' '.join(text.split())
    
    # Remove null bytes and other problematic characters
    text = text.replace('\x00', '').replace('\r', ' ').replace('\n', ' ')
    
    return text.strip()

def calculate_confidence_threshold(emotion_intensity: float, text_length: int) -> float:
    """Calculate dynamic confidence threshold based on emotion intensity and text length"""
    base_threshold = 0.7
    
    # Adjust based on emotion intensity
    if emotion_intensity > 80:
        base_threshold -= 0.1  # Lower threshold for high emotion intensity
    elif emotion_intensity < 30:
        base_threshold += 0.1  # Higher threshold for low emotion intensity
    
    # Adjust based on text length
    if text_length < 20:
        base_threshold += 0.05  # Higher threshold for very short text
    elif text_length > 500:
        base_threshold -= 0.05  # Lower threshold for long text
    
    return max(0.5, min(0.9, base_threshold))  # Clamp between 0.5 and 0.9