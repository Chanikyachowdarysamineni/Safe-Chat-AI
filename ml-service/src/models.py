from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class TextAnalysisRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=2000, description="Text to analyze")

class BatchAnalysisRequest(BaseModel):
    texts: List[str] = Field(..., min_items=1, max_items=100, description="List of texts to analyze")

class SecondaryEmotion(BaseModel):
    emotion: str = Field(..., description="Secondary emotion name")
    intensity: float = Field(..., ge=0, le=100, description="Emotion intensity (0-100)")

class TextAnalysisResponse(BaseModel):
    abuse_detected: bool = Field(..., description="Whether abuse was detected")
    abuse_type: str = Field(..., description="Type of abuse detected")
    confidence_score: float = Field(..., ge=0, le=100, description="Confidence score for abuse detection")
    emotion: str = Field(..., description="Primary emotion detected")
    emotion_intensity: float = Field(..., ge=0, le=100, description="Primary emotion intensity")
    secondary_emotions: List[SecondaryEmotion] = Field(default=[], description="Secondary emotions")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")
    timestamp: datetime = Field(..., description="Analysis timestamp")

class BatchAnalysisResponse(BaseModel):
    results: List[dict] = Field(..., description="Analysis results for each text")
    total_processed: int = Field(..., description="Total number of texts processed")
    processing_time_ms: float = Field(..., description="Total processing time in milliseconds")
    timestamp: datetime = Field(..., description="Analysis timestamp")

class ModelInfo(BaseModel):
    name: str = Field(..., description="Model name")
    status: str = Field(..., description="Model status")

class ModelsInfoResponse(BaseModel):
    emotion_model: ModelInfo
    abuse_model: ModelInfo
    labels: dict = Field(..., description="Available labels for emotions and abuse types")