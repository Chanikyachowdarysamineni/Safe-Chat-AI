from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
import os
from dotenv import load_dotenv
from datetime import datetime
import time

from src.models import TextAnalysisRequest, TextAnalysisResponse, BatchAnalysisRequest, BatchAnalysisResponse
from src.analyzer import EmotionAnalyzer, AbuseDetector
from src.utils import setup_logging

# Load environment variables
load_dotenv()

# Setup logging
logger = setup_logging()

# Initialize FastAPI app
app = FastAPI(
    title="SafeChat AI - ML Service",
    description="Machine Learning service for abuse detection and emotion analysis",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global analyzers
emotion_analyzer = None
abuse_detector = None

@app.on_event("startup")
async def startup_event():
    """Initialize ML models on startup"""
    global emotion_analyzer, abuse_detector
    
    logger.info("Initializing ML models...")
    
    try:
        # Initialize emotion analyzer
        emotion_analyzer = EmotionAnalyzer()
        await emotion_analyzer.load_model()
        
        # Initialize abuse detector
        abuse_detector = AbuseDetector()
        await abuse_detector.load_model()
        
        logger.info("ML models initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize ML models: {e}")
        raise e

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "SafeChat AI ML Service",
        "version": "1.0.0"
    }

@app.get("/models/info")
async def get_model_info():
    """Get information about loaded models"""
    try:
        return {
            "emotion_model": {
                "name": emotion_analyzer.model_name if emotion_analyzer else "not_loaded",
                "status": "loaded" if emotion_analyzer and emotion_analyzer.model else "not_loaded"
            },
            "abuse_model": {
                "name": abuse_detector.model_name if abuse_detector else "not_loaded", 
                "status": "loaded" if abuse_detector and abuse_detector.model else "not_loaded"
            },
            "labels": {
                "emotions": emotion_analyzer.emotion_labels if emotion_analyzer else [],
                "abuse_types": abuse_detector.abuse_types if abuse_detector else []
            }
        }
    except Exception as e:
        logger.error(f"Error getting model info: {e}")
        raise HTTPException(status_code=500, detail="Error retrieving model information")

@app.post("/analyze", response_model=TextAnalysisResponse)
async def analyze_text(request: TextAnalysisRequest):
    """Analyze a single text for abuse and emotions"""
    try:
        start_time = time.time()
        
        if not emotion_analyzer or not abuse_detector:
            raise HTTPException(status_code=503, detail="Models not loaded")
            
        # Validate text length
        if len(request.text) > int(os.getenv("MAX_TEXT_LENGTH", 2000)):
            raise HTTPException(status_code=400, detail="Text too long")
            
        # Analyze emotions
        emotion_result = await emotion_analyzer.analyze(request.text)
        
        # Detect abuse
        abuse_result = await abuse_detector.analyze(request.text)
        
        # Combine results
        response = TextAnalysisResponse(
            abuse_detected=abuse_result["abuse_detected"],
            abuse_type=abuse_result["abuse_type"],
            confidence_score=abuse_result["confidence_score"],
            emotion=emotion_result["emotion"],
            emotion_intensity=emotion_result["intensity"],
            secondary_emotions=emotion_result["secondary_emotions"],
            processing_time_ms=round((time.time() - start_time) * 1000, 2),
            timestamp=datetime.utcnow()
        )
        
        logger.info(f"Analyzed text - Abuse: {response.abuse_detected}, Emotion: {response.emotion}")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing text: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/batch-analyze", response_model=BatchAnalysisResponse)
async def batch_analyze_texts(request: BatchAnalysisRequest):
    """Analyze multiple texts in batch"""
    try:
        start_time = time.time()
        
        if not emotion_analyzer or not abuse_detector:
            raise HTTPException(status_code=503, detail="Models not loaded")
            
        if len(request.texts) > 100:  # Limit batch size
            raise HTTPException(status_code=400, detail="Batch size too large (max 100)")
            
        results = []
        
        for text in request.texts:
            # Validate individual text length
            if len(text) > int(os.getenv("MAX_TEXT_LENGTH", 2000)):
                results.append({
                    "error": "Text too long",
                    "abuse_detected": False,
                    "abuse_type": "none",
                    "confidence_score": 0,
                    "emotion": "neutral",
                    "emotion_intensity": 0,
                    "secondary_emotions": []
                })
                continue
                
            try:
                # Analyze emotions
                emotion_result = await emotion_analyzer.analyze(text)
                
                # Detect abuse
                abuse_result = await abuse_detector.analyze(text)
                
                # Add result
                results.append({
                    "abuse_detected": abuse_result["abuse_detected"],
                    "abuse_type": abuse_result["abuse_type"],
                    "confidence_score": abuse_result["confidence_score"],
                    "emotion": emotion_result["emotion"],
                    "emotion_intensity": emotion_result["intensity"],
                    "secondary_emotions": emotion_result["secondary_emotions"]
                })
                
            except Exception as e:
                logger.error(f"Error analyzing individual text: {e}")
                results.append({
                    "error": str(e),
                    "abuse_detected": False,
                    "abuse_type": "none",
                    "confidence_score": 0,
                    "emotion": "neutral",
                    "emotion_intensity": 0,
                    "secondary_emotions": []
                })
        
        response = BatchAnalysisResponse(
            results=results,
            total_processed=len(request.texts),
            processing_time_ms=round((time.time() - start_time) * 1000, 2),
            timestamp=datetime.utcnow()
        )
        
        logger.info(f"Batch analyzed {len(request.texts)} texts")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in batch analysis: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "False").lower() == "true"
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=debug,
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )