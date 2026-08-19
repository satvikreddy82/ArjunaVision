"""Location API Router"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, update
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

from app.database import get_db
from app.dependencies import get_current_user
from app.models.models import User, Location

router = APIRouter()


class LocationUpdateRequest(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None
    address: Optional[str] = None
    source: Optional[str] = "GPS"


@router.post("")
async def update_location(
    data: LocationUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Mark previous last_known as false
    await db.execute(
        update(Location)
        .where(Location.user_id == current_user.id, Location.is_last_known == True)
        .values(is_last_known=False)
    )

    loc = Location(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        latitude=data.latitude,
        longitude=data.longitude,
        accuracy=data.accuracy,
        address=data.address,
        source=data.source or "GPS",
        is_last_known=True,
        timestamp=datetime.utcnow(),
    )
    db.add(loc)
    await db.commit()
    return {"message": "Location updated", "id": loc.id, "timestamp": loc.timestamp.isoformat()}


@router.get("/current")
async def get_current_location(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Location)
        .where(Location.user_id == current_user.id, Location.is_last_known == True)
        .order_by(desc(Location.timestamp))
        .limit(1)
    )
    loc = result.scalar_one_or_none()
    if not loc:
        return {"available": False, "message": "No location data recorded yet"}

    return {
        "available": True,
        "is_last_known": True,
        "latitude": loc.latitude,
        "longitude": loc.longitude,
        "accuracy": loc.accuracy,
        "address": loc.address,
        "source": loc.source,
        "timestamp": loc.timestamp.isoformat(),
    }


@router.get("/history")
async def get_location_history(
    hours: int = 24,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import timedelta
    since = datetime.utcnow() - timedelta(hours=hours)
    result = await db.execute(
        select(Location)
        .where(Location.user_id == current_user.id, Location.timestamp >= since)
        .order_by(desc(Location.timestamp))
        .limit(200)
    )
    locs = result.scalars().all()
    return [
        {
            "id": l.id,
            "latitude": l.latitude,
            "longitude": l.longitude,
            "address": l.address,
            "accuracy": l.accuracy,
            "source": l.source,
            "is_last_known": l.is_last_known,
            "timestamp": l.timestamp.isoformat(),
        }
        for l in locs
    ]
