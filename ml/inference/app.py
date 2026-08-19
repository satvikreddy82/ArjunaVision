"""ML Inference Service — FastAPI"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import os
import pickle
import numpy as np

app = FastAPI(title="ArjunaVision ML Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "risk_model.pkl")
model = None

@app.on_event("startup")
async def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
        print(f"[ML] Model loaded from {MODEL_PATH}")
    else:
        print("[ML] No model file found. Using rule-based fallback.")


class PredictRequest(BaseModel):
    fall_detected: bool = False
    health_anomaly: bool = False
    movement_anomaly: bool = False
    route_deviation: bool = False
    inactivity: bool = False
    no_response: bool = False
    gps_unavailable: bool = False
    health_anomaly_severity: float = 0.0
    heart_rate: Optional[float] = None
    systolic_bp: Optional[float] = None
    blood_oxygen: Optional[float] = None


def rule_based_score(data: PredictRequest) -> float:
    """Fallback rule-based score when model is unavailable."""
    score = 0.0
    if data.fall_detected: score += 0.35
    if data.health_anomaly: score += 0.25 + data.health_anomaly_severity * 0.15
    if data.movement_anomaly: score += 0.15
    if data.route_deviation: score += 0.20
    if data.inactivity: score += 0.20
    if data.no_response: score += 0.25
    if data.gps_unavailable: score += 0.05
    return min(1.0, score)


@app.post("/predict")
async def predict(data: PredictRequest):
    features = np.array([[
        int(data.fall_detected),
        int(data.health_anomaly),
        int(data.movement_anomaly),
        int(data.route_deviation),
        int(data.inactivity),
        int(data.no_response),
        int(data.gps_unavailable),
        data.health_anomaly_severity,
        data.heart_rate or 72.0,
        data.systolic_bp or 120.0,
        data.blood_oxygen or 98.0,
    ]])

    if model is not None:
        try:
            proba = model.predict_proba(features)[0]
            risk_score = float(proba[1]) if len(proba) > 1 else rule_based_score(data)
            prediction = "HIGH_RISK" if risk_score > 0.6 else ("UNUSUAL" if risk_score > 0.3 else "NORMAL")
            source = "ml_model"
        except Exception as e:
            risk_score = rule_based_score(data)
            prediction = "HIGH_RISK" if risk_score > 0.6 else ("UNUSUAL" if risk_score > 0.3 else "NORMAL")
            source = "rule_based_fallback"
    else:
        risk_score = rule_based_score(data)
        prediction = "HIGH_RISK" if risk_score > 0.6 else ("UNUSUAL" if risk_score > 0.3 else "NORMAL")
        source = "rule_based_fallback"

    explanation = []
    if data.fall_detected: explanation.append("Fall signal detected")
    if data.health_anomaly: explanation.append("Health anomaly above baseline")
    if data.no_response: explanation.append("No response to safety check")
    if data.inactivity: explanation.append("Prolonged inactivity")
    if data.route_deviation: explanation.append("Route deviation detected")
    if not explanation: explanation.append("All signals within normal parameters")

    return {
        "risk_score": round(risk_score, 3),
        "prediction": prediction,
        "explanation": explanation,
        "source": source,
        "confidence": round(abs(risk_score - 0.5) * 2, 2),
    }


@app.get("/")
async def root():
    return {"service": "ArjunaVision ML Inference", "model_loaded": model is not None, "status": "online"}
