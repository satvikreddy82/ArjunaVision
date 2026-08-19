"""Emergency API Router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid
import httpx

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import User, EmergencyEvent, EmergencyTrigger, EmergencyStatus, Location, RiskAssessment
from app.services.risk_engine import RiskSignals, analyze_risk, RiskLevel
from app.config import settings

router = APIRouter()


class TriggerEmergencyRequest(BaseModel):
    trigger: str = "MANUAL_SOS"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    last_known_latitude: Optional[float] = None
    last_known_longitude: Optional[float] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    signals: Optional[dict] = None


class CancelEmergencyRequest(BaseModel):
    reason: Optional[str] = "User confirmed safe"


@router.post("/trigger")
async def trigger_emergency(
    data: TriggerEmergencyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Build risk signals from trigger type
    signals = RiskSignals()
    trigger = data.trigger.upper()

    if trigger == "MANUAL_SOS":
        signals.manual_sos = True
    elif trigger == "VOICE_SOS":
        signals.voice_sos = True
    elif trigger == "FALL_DETECTION":
        signals.fall_detected = True
        signals.no_response_to_check = True
    elif trigger == "HEALTH_ANOMALY":
        signals.health_anomaly = True
        signals.health_anomaly_severity = 0.7
    elif trigger == "ROUTE_DEVIATION":
        signals.route_deviation = True
    elif trigger == "INACTIVITY":
        signals.inactivity = True
    elif trigger == "MULTI_SIGNAL":
        signals.fall_detected = True
        signals.health_anomaly = True
        signals.inactivity = True
        signals.no_response_to_check = True
        signals.multiple_signals = True
    elif trigger == "SIMULATED_EMERGENCY":
        signals.fall_detected = True
        signals.health_anomaly = True
        signals.inactivity = True
        signals.no_response_to_check = True
        signals.multiple_signals = True

    # Override with user-provided signals if any
    if data.signals:
        for k, v in data.signals.items():
            if hasattr(signals, k):
                setattr(signals, k, v)

    # Try to get ML prediction
    ml_score = None
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            ml_resp = await client.post(
                f"{settings.ML_SERVICE_URL}/predict",
                json={
                    "fall_detected": signals.fall_detected,
                    "health_anomaly": signals.health_anomaly,
                    "movement_anomaly": signals.movement_anomaly,
                    "route_deviation": signals.route_deviation,
                    "inactivity": signals.inactivity,
                    "no_response": signals.no_response_to_check,
                    "gps_unavailable": signals.gps_unavailable,
                    "health_anomaly_severity": signals.health_anomaly_severity,
                },
            )
            if ml_resp.status_code == 200:
                ml_score = ml_resp.json().get("risk_score")
    except Exception:
        pass  # ML service unavailable; use rule-based only

    risk = analyze_risk(signals, ml_score)

    # Get last known location if current unavailable
    lat = data.latitude
    lng = data.longitude
    last_known_lat = data.last_known_latitude
    last_known_lng = data.last_known_longitude

    if not last_known_lat:
        loc_result = await db.execute(
            select(Location)
            .where(Location.user_id == current_user.id)
            .order_by(desc(Location.timestamp))
            .limit(1)
        )
        last_loc = loc_result.scalar_one_or_none()
        if last_loc:
            last_known_lat = last_loc.latitude
            last_known_lng = last_loc.longitude

    event = EmergencyEvent(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        trigger=EmergencyTrigger(trigger) if trigger in [e.value for e in EmergencyTrigger] else EmergencyTrigger.MANUAL_SOS,
        status=EmergencyStatus.ACTIVE,
        latitude=lat,
        longitude=lng,
        last_known_latitude=last_known_lat,
        last_known_longitude=last_known_lng,
        address=data.address,
        risk_score=risk.risk_score,
        risk_level=risk.risk_level,
        signals=signals.__dict__,
        notes=data.notes,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)

    return {
        "event_id": event.id,
        "status": "ACTIVE",
        "risk_score": risk.risk_score,
        "risk_level": risk.risk_level,
        "reasons": risk.reasons,
        "recommended_action": risk.recommended_action,
        "latitude": lat,
        "longitude": lng,
        "last_known_latitude": last_known_lat,
        "last_known_longitude": last_known_lng,
        "timestamp": event.created_at.isoformat(),
    }


@router.get("/active")
async def get_active_emergency(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmergencyEvent)
        .where(
            EmergencyEvent.user_id == current_user.id,
            EmergencyEvent.status == EmergencyStatus.ACTIVE,
        )
        .order_by(desc(EmergencyEvent.created_at))
        .limit(1)
    )
    event = result.scalar_one_or_none()
    if not event:
        return {"active": False}

    return {
        "active": True,
        "event_id": event.id,
        "trigger": event.trigger,
        "risk_score": event.risk_score,
        "risk_level": event.risk_level,
        "signals": event.signals,
        "latitude": event.latitude,
        "longitude": event.longitude,
        "last_known_latitude": event.last_known_latitude,
        "last_known_longitude": event.last_known_longitude,
        "address": event.address,
        "started_at": event.created_at.isoformat(),
    }


@router.post("/{event_id}/cancel")
async def cancel_emergency(
    event_id: str,
    data: CancelEmergencyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmergencyEvent).where(
            EmergencyEvent.id == event_id,
            EmergencyEvent.user_id == current_user.id,
        )
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Emergency event not found")

    event.status = EmergencyStatus.CANCELLED
    event.resolved_at = datetime.utcnow()
    event.notes = (event.notes or "") + f"\nCancelled: {data.reason}"
    await db.commit()

    return {"message": "Emergency cancelled", "event_id": event_id}


@router.get("/history")
async def get_emergency_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmergencyEvent)
        .where(EmergencyEvent.user_id == current_user.id)
        .order_by(desc(EmergencyEvent.created_at))
        .limit(50)
    )
    events = result.scalars().all()
    return [
        {
            "id": e.id,
            "trigger": e.trigger,
            "status": e.status,
            "risk_level": e.risk_level,
            "risk_score": e.risk_score,
            "latitude": e.latitude,
            "longitude": e.longitude,
            "address": e.address,
            "created_at": e.created_at.isoformat(),
            "resolved_at": e.resolved_at.isoformat() if e.resolved_at else None,
        }
        for e in events
    ]
