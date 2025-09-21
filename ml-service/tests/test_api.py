import pytest
import asyncio
from fastapi.testclient import TestClient
from src.main import app
from src.analyzer import EmotionAnalyzer, AbuseDetector

client = TestClient(app)

class TestMLService:
    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"

    def test_analyze_endpoint_valid_text(self):
        """Test text analysis with valid input"""
        test_data = {
            "text": "I am really happy today!"
        }
        response = client.post("/analyze", json=test_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "abuse_detected" in data
        assert "emotion" in data
        assert "emotion_intensity" in data
        assert "confidence_score" in data

    def test_analyze_endpoint_empty_text(self):
        """Test text analysis with empty input"""
        test_data = {
            "text": ""
        }
        response = client.post("/analyze", json=test_data)
        assert response.status_code == 422  # Validation error

    def test_analyze_endpoint_long_text(self):
        """Test text analysis with text that's too long"""
        test_data = {
            "text": "a" * 3000  # Exceeds max length
        }
        response = client.post("/analyze", json=test_data)
        assert response.status_code == 400

    def test_batch_analyze_endpoint(self):
        """Test batch analysis endpoint"""
        test_data = {
            "texts": [
                "I love this!",
                "This is terrible",
                "I'm feeling okay"
            ]
        }
        response = client.post("/batch-analyze", json=test_data)
        assert response.status_code == 200
        
        data = response.json()
        assert "results" in data
        assert len(data["results"]) == 3
        assert "total_processed" in data

    def test_models_info_endpoint(self):
        """Test models info endpoint"""
        response = client.get("/models/info")
        assert response.status_code == 200
        
        data = response.json()
        assert "emotion_model" in data
        assert "abuse_model" in data

class TestAnalyzers:
    @pytest.mark.asyncio
    async def test_emotion_analyzer(self):
        """Test emotion analyzer directly"""
        analyzer = EmotionAnalyzer()
        
        # Mock the model loading for testing
        analyzer.model = True
        analyzer.classifier = lambda x: [[{
            'label': 'joy',
            'score': 0.8
        }, {
            'label': 'neutral',
            'score': 0.2
        }]]
        
        result = await analyzer.analyze("I am happy!")
        
        assert "emotion" in result
        assert "intensity" in result
        assert result["emotion"] == "joy"

    @pytest.mark.asyncio
    async def test_abuse_detector(self):
        """Test abuse detector directly"""
        detector = AbuseDetector()
        
        # Mock the model loading for testing
        detector.model = True
        detector.classifier = lambda x: [[{
            'label': 'TOXIC',
            'score': 0.9
        }]]
        
        result = await detector.analyze("This is a test message")
        
        assert "abuse_detected" in result
        assert "abuse_type" in result
        assert "confidence_score" in result

if __name__ == "__main__":
    pytest.main([__file__])