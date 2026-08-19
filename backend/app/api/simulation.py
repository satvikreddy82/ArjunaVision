"""Simulation API — Demo mode scenario triggers"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import User, EmergencyEvent, EmergencyTrigger, EmergencyStatus, HealthReading, Location, AnomalyType
from app.services.risk_engine import RiskSignals, analyze_risk

router = APIRouter()

# Demo GPS coordinates (simulated — Bengaluru, India)
DEMO_LOCATIONS = [
    {"lat": 12.9716, "lng": 77.5946, "address": "MG Road, Bengaluru"},
    {"lat": 12.9352, "lng": 77.6245, "address": "Koramangala, Bengaluru"},
    {"lat": 12.9767, "lng": 77.5713, "address": "Cubbon Park, Bengaluru"},
]

SCENARIOS = {
    "manual_sos": {
        "name": "Scenario 1 — Manual SOS",
        "description": "User presses SOS button → GPS → Alert → Dashboard",
        "steps": ["SOS Button Pressed", "GPS Retrieved", "Emergency Created", "Contacts Notified", "Facilities Shown"],
    },
    "voice_sos": {
        "name": "Scenario 2 — Voice Emergency",
        "description": "Voice command → Detection → SOS",
        "steps": ["Voice Command Detected", "Phrase Matched", "Emergency Triggered"],
    },
    "fall_detection": {
        "name": "Scenario 3 — Fall Detection",
        "description": "Fall → Check user → No response → Emergency",
        "steps": ["Fall Detected", "Safety Check Sent", "No Response (15s)", "Risk Escalated", "Emergency Activated"],
    },
    "health_anomaly": {
        "name": "Scenario 4 — Health Anomaly",
        "description": "Abnormal pattern → AI analysis → Risk increase → Alert",
        "steps": ["Abnormal Reading", "AI Analysis", "Baseline Deviation", "Risk Elevated", "Guardian Alerted"],
    },
    "gps_unavailable": {
        "name": "Scenario 5 — GPS Unavailable",
        "description": "Emergency → Current location unavailable → Last known → Alert",
        "steps": ["Emergency Triggered", "GPS Unavailable", "Last Known Retrieved", "Alert with Last Known", "Guardian Notified"],
    },
    "route_deviation": {
        "name": "Scenario 6 — Route Deviation",
        "description": "Route deviation → Warning → No response → Escalation",
        "steps": ["Route Deviation Detected", "Warning Sent", "No Response", "Risk Increased", "Contacts Alerted"],
    },
}


class RunScenarioRequest(BaseModel):
    scenario: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None


@router.get("/scenarios")
async def list_scenarios():
    return {"scenarios": SCENARIOS}


@router.post("/run")
async def run_scenario(
    data: RunScenarioRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    scenario = SCENARIOS.get(data.scenario)
    if not scenario:
        raise HTTPException(status_code=400, detail=f"Unknown scenario: {data.scenario}")

    demo_loc = DEMO_LOCATIONS[0]
    lat = data.latitude or demo_loc["lat"]
    lng = data.longitude or demo_loc["lng"]

    # Build signals based on scenario
    signals = RiskSignals()
    trigger = EmergencyTrigger.SIMULATED_EMERGENCY

    if data.scenario == "manual_sos":
        signals.manual_sos = True
        trigger = EmergencyTrigger.MANUAL_SOS

    elif data.scenario == "voice_sos":
        signals.voice_sos = True
        trigger = EmergencyTrigger.VOICE_SOS

    elif data.scenario == "fall_detection":
        signals.fall_detected = True
        signals.inactivity = True
        signals.no_response_to_check = True
        trigger = EmergencyTrigger.FALL_DETECTION

        # Add simulated health anomaly reading
        reading = HealthReading(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            heart_rate=118.0,
            systolic_bp=145.0,
            blood_oxygen=96.0,
            activity_level="RESTING",
            is_anomaly=True,
            anomaly_type=AnomalyType.HIGH_RISK,
            source="SIMULATED",
        )
        db.add(reading)

    elif data.scenario == "health_anomaly":
        signals.health_anomaly = True
        signals.health_anomaly_severity = 0.8
        trigger = EmergencyTrigger.HEALTH_ANOMALY

        reading = HealthReading(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            heart_rate=145.0,
            systolic_bp=168.0,
            blood_oxygen=91.0,
            is_anomaly=True,
            anomaly_type=AnomalyType.HIGH_RISK,
            source="SIMULATED",
        )
        db.add(reading)

    elif data.scenario == "gps_unavailable":
        signals.manual_sos = True
        signals.gps_unavailable = True
        lat = None
        lng = None
        trigger = EmergencyTrigger.MANUAL_SOS

    elif data.scenario == "route_deviation":
        signals.route_deviation = True
        signals.no_response_to_check = True
        trigger = EmergencyTrigger.ROUTE_DEVIATION

    # Also for the multi-signal fall scenario
    if data.scenario in ("fall_detection", "health_anomaly"):
        signals.multiple_signals = True

    risk = analyze_risk(signals)

    # Store a location point for last-known
    last_known_lat = DEMO_LOCATIONS[1]["lat"]
    last_known_lng = DEMO_LOCATIONS[1]["lng"]

    event = EmergencyEvent(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        trigger=trigger,
        status=EmergencyStatus.ACTIVE,
        latitude=lat,
        longitude=lng,
        last_known_latitude=last_known_lat,
        last_known_longitude=last_known_lng,
        address=demo_loc["address"] if lat else "GPS Unavailable",
        risk_score=risk.risk_score,
        risk_level=risk.risk_level,
        signals=signals.__dict__,
        notes=f"[SIMULATION] {scenario['name']}",
    )
    db.add(event)
    await db.commit()

    return {
        "simulation": True,
        "scenario": data.scenario,
        "scenario_name": scenario["name"],
        "description": scenario["description"],
        "steps": scenario["steps"],
        "event_id": event.id,
        "risk_score": risk.risk_score,
        "risk_level": risk.risk_level,
        "reasons": risk.reasons,
        "recommended_action": risk.recommended_action,
        "latitude": lat,
        "longitude": lng,
        "last_known_latitude": last_known_lat,
        "last_known_longitude": last_known_lng,
        "gps_available": lat is not None,
        "timestamp": event.created_at.isoformat(),
    }


@router.post("/seed-demo-data")
async def seed_demo_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Seed realistic demo health readings and locations for the hackathon demo."""
    from datetime import timedelta
    import random

    now = datetime.utcnow()

    # Seed 48 hours of health readings (every 30 min)
    for i in range(96):
        ts = now - timedelta(minutes=30 * i)
        hour = ts.hour
        # Simulate realistic circadian pattern
        if 0 <= hour < 6:
            hr = random.gauss(58, 4)  # sleeping
            activity = "RESTING"
        elif 6 <= hour < 9:
            hr = random.gauss(75, 6)
            activity = "LIGHT"
        elif 9 <= hour < 18:
            hr = random.gauss(72, 8)
            activity = "MODERATE"
        else:
            hr = random.gauss(68, 5)
            activity = "LIGHT"

        reading = HealthReading(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            heart_rate=max(45, min(130, hr)),
            systolic_bp=random.gauss(118, 6),
            diastolic_bp=random.gauss(76, 4),
            blood_oxygen=random.gauss(98, 0.5),
            steps=random.randint(0, 500) if activity != "RESTING" else 0,
            activity_level=activity,
            sleep_hours=7.5 if 0 <= hour < 6 else None,
            is_anomaly=False,
            anomaly_type=AnomalyType.NORMAL,
            source="SIMULATED",
            timestamp=ts,
        )
        db.add(reading)

    # Seed 48 hours of location history
    locations = [
        {"lat": 12.9716 + random.gauss(0, 0.003), "lng": 77.5946 + random.gauss(0, 0.003), "address": "Home"}
        for _ in range(24)
    ] + [
        {"lat": 12.9352 + random.gauss(0, 0.002), "lng": 77.6245 + random.gauss(0, 0.002), "address": "College"}
        for _ in range(24)
    ]

    for i, loc_data in enumerate(locations):
        ts = now - timedelta(hours=i)
        loc = Location(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            latitude=loc_data["lat"],
            longitude=loc_data["lng"],
            address=loc_data["address"],
            accuracy=5.0,
            is_last_known=(i == 0),
            source="SIMULATED",
            timestamp=ts,
        )
        db.add(loc)

    await db.commit()
    return {"message": "Demo data seeded successfully", "health_readings": 96, "locations": 48}
