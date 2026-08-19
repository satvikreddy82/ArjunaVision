"""Health API Router"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
import uuid
import statistics

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import User, HealthReading, AnomalyType

router = APIRouter()


class HealthReadingRequest(BaseModel):
    heart_rate: Optional[float] = None
    systolic_bp: Optional[float] = None
    diastolic_bp: Optional[float] = None
    blood_oxygen: Optional[float] = None
    steps: Optional[int] = None
    activity_level: Optional[str] = "RESTING"
    sleep_hours: Optional[float] = None
    source: Optional[str] = "MANUAL"


def detect_anomaly(reading: HealthReadingRequest, baseline: dict) -> tuple[bool, AnomalyType, float]:
    """Compare reading against personal baseline. Returns (is_anomaly, type, severity)."""
    anomaly_score = 0.0

    if reading.heart_rate and baseline.get("avg_hr"):
        hr_dev = abs(reading.heart_rate - baseline["avg_hr"]) / max(baseline.get("std_hr", 10), 1)
        if hr_dev > 2.5:
            anomaly_score += hr_dev * 0.4

    if reading.systolic_bp and baseline.get("avg_systolic"):
        bp_dev = abs(reading.systolic_bp - baseline["avg_systolic"]) / max(baseline.get("std_systolic", 10), 1)
        if bp_dev > 2:
            anomaly_score += bp_dev * 0.3

    if reading.blood_oxygen and reading.blood_oxygen < 94:
        anomaly_score += (94 - reading.blood_oxygen) * 0.3

    severity = min(1.0, anomaly_score / 5.0)

    if anomaly_score > 3:
        return True, AnomalyType.HIGH_RISK, severity
    elif anomaly_score > 1.5:
        return True, AnomalyType.UNUSUAL, severity
    return False, AnomalyType.NORMAL, 0.0


async def get_user_baseline(user_id: str, db: AsyncSession) -> dict:
    """Compute personal baseline from last 30 days of readings."""
    since = datetime.utcnow() - timedelta(days=30)
    result = await db.execute(
        select(HealthReading)
        .where(HealthReading.user_id == user_id, HealthReading.timestamp >= since)
        .order_by(desc(HealthReading.timestamp))
        .limit(100)
    )
    readings = result.scalars().all()

    if not readings:
        return {"avg_hr": 72, "std_hr": 8, "avg_systolic": 120, "std_systolic": 8}

    hr_vals = [r.heart_rate for r in readings if r.heart_rate]
    sys_vals = [r.systolic_bp for r in readings if r.systolic_bp]

    return {
        "avg_hr": statistics.mean(hr_vals) if hr_vals else 72,
        "std_hr": statistics.stdev(hr_vals) if len(hr_vals) > 1 else 8,
        "avg_systolic": statistics.mean(sys_vals) if sys_vals else 120,
        "std_systolic": statistics.stdev(sys_vals) if len(sys_vals) > 1 else 8,
        "sample_count": len(readings),
    }


@router.post("/readings")
async def add_health_reading(
    data: HealthReadingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    baseline = await get_user_baseline(current_user.id, db)
    is_anomaly, anomaly_type, severity = detect_anomaly(data, baseline)

    reading = HealthReading(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        heart_rate=data.heart_rate,
        systolic_bp=data.systolic_bp,
        diastolic_bp=data.diastolic_bp,
        blood_oxygen=data.blood_oxygen,
        steps=data.steps,
        activity_level=data.activity_level,
        sleep_hours=data.sleep_hours,
        is_anomaly=is_anomaly,
        anomaly_type=anomaly_type,
        source=data.source or "MANUAL",
    )
    db.add(reading)
    await db.commit()

    return {
        "id": reading.id,
        "is_anomaly": is_anomaly,
        "anomaly_type": anomaly_type,
        "anomaly_severity": severity,
        "baseline": baseline,
        "timestamp": reading.timestamp.isoformat(),
        "message": (
            "Reading is unusual compared with your recent personal pattern."
            if is_anomaly
            else "Reading is within your normal personal range."
        ),
    }


@router.get("/readings")
async def get_health_readings(
    hours: int = 24,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(hours=hours)
    result = await db.execute(
        select(HealthReading)
        .where(HealthReading.user_id == current_user.id, HealthReading.timestamp >= since)
        .order_by(desc(HealthReading.timestamp))
        .limit(200)
    )
    readings = result.scalars().all()
    return [
        {
            "id": r.id,
            "heart_rate": r.heart_rate,
            "systolic_bp": r.systolic_bp,
            "diastolic_bp": r.diastolic_bp,
            "blood_oxygen": r.blood_oxygen,
            "steps": r.steps,
            "activity_level": r.activity_level,
            "sleep_hours": r.sleep_hours,
            "is_anomaly": r.is_anomaly,
            "anomaly_type": r.anomaly_type,
            "timestamp": r.timestamp.isoformat(),
        }
        for r in readings
    ]


@router.get("/baseline")
async def get_baseline(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_user_baseline(current_user.id, db)


@router.get("/anomalies")
async def get_anomalies(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(HealthReading)
        .where(HealthReading.user_id == current_user.id, HealthReading.is_anomaly == True)
        .order_by(desc(HealthReading.timestamp))
        .limit(50)
    )
    readings = result.scalars().all()
    return [
        {
            "id": r.id,
            "anomaly_type": r.anomaly_type,
            "heart_rate": r.heart_rate,
            "systolic_bp": r.systolic_bp,
            "blood_oxygen": r.blood_oxygen,
            "timestamp": r.timestamp.isoformat(),
        }
        for r in readings
    ]
