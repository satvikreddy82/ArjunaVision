"""Stub routers for remaining API modules"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, update, delete
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

from app.database import get_db
from app.dependencies import get_current_user, get_admin_user
from app.models.models import User, Profile, EmergencyContact, Notification, PrivacySettings, SafeRoute, EmergencyEvent, HealthReading

# ── Users ──────────────────────────────────────────────────────
users_router = APIRouter()

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[str] = None
    medical_notes: Optional[str] = None
    emergency_phrase: Optional[str] = None
    safety_sensitivity: Optional[str] = None

@users_router.get("/me")
async def get_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    return {
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "profile": {
            "name": profile.name if profile else "",
            "phone": profile.phone if profile else "",
            "blood_group": profile.blood_group if profile else "",
            "allergies": profile.allergies if profile else "",
            "medical_notes": profile.medical_notes if profile else "",
            "emergency_phrase": profile.emergency_phrase if profile else "help me",
            "safety_sensitivity": profile.safety_sensitivity if profile else "MEDIUM",
        } if profile else None,
    }

@users_router.put("/me")
async def update_profile(data: ProfileUpdateRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    for field, value in data.dict(exclude_none=True).items():
        setattr(profile, field, value)
    await db.commit()
    return {"message": "Profile updated"}


# ── Contacts ───────────────────────────────────────────────────
contacts_router = APIRouter()

class ContactRequest(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    relationship: Optional[str] = "Other"
    priority: Optional[int] = 1
    notify_on_emergency: Optional[bool] = True
    notify_on_warning: Optional[bool] = False

@contacts_router.get("")
async def list_contacts(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EmergencyContact).where(EmergencyContact.user_id == current_user.id).order_by(EmergencyContact.priority))
    contacts = result.scalars().all()
    return [{"id": c.id, "name": c.name, "phone": c.phone, "email": c.email, "relationship": c.relationship, "priority": c.priority, "notify_on_emergency": c.notify_on_emergency} for c in contacts]

@contacts_router.post("", status_code=201)
async def create_contact(data: ContactRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    contact = EmergencyContact(id=str(uuid.uuid4()), user_id=current_user.id, **data.dict())
    db.add(contact)
    await db.commit()
    return {"id": contact.id, "message": "Contact added"}

@contacts_router.put("/{contact_id}")
async def update_contact(contact_id: str, data: ContactRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EmergencyContact).where(EmergencyContact.id == contact_id, EmergencyContact.user_id == current_user.id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    for field, value in data.dict(exclude_none=True).items():
        setattr(contact, field, value)
    await db.commit()
    return {"message": "Contact updated"}

@contacts_router.delete("/{contact_id}")
async def delete_contact(contact_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(EmergencyContact).where(EmergencyContact.id == contact_id, EmergencyContact.user_id == current_user.id))
    contact = result.scalar_one_or_none()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    await db.delete(contact)
    await db.commit()
    return {"message": "Contact deleted"}


# ── Risk ───────────────────────────────────────────────────────
risk_router = APIRouter()

from app.services.risk_engine import RiskSignals, analyze_risk

class RiskAnalyzeRequest(BaseModel):
    fall_detected: bool = False
    health_anomaly: bool = False
    movement_anomaly: bool = False
    route_deviation: bool = False
    inactivity: bool = False
    no_response_to_check: bool = False
    gps_unavailable: bool = False
    low_battery: bool = False
    device_offline: bool = False

@risk_router.post("/analyze")
async def analyze(data: RiskAnalyzeRequest, current_user: User = Depends(get_current_user)):
    signals = RiskSignals(**data.dict())
    result = analyze_risk(signals)
    return {"risk_score": result.risk_score, "risk_level": result.risk_level, "reasons": result.reasons, "recommended_action": result.recommended_action, "timestamp": result.timestamp}

@risk_router.get("/current")
async def get_current_risk(current_user: User = Depends(get_current_user)):
    # Default safe assessment
    return {"risk_score": 8.0, "risk_level": "LOW", "reasons": ["All signals within normal range"], "recommended_action": "Continue normal monitoring."}


# ── Notifications ──────────────────────────────────────────────
notifications_router = APIRouter()

@notifications_router.get("")
async def list_notifications(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Notification).where(Notification.user_id == current_user.id).order_by(desc(Notification.created_at)).limit(50))
    notifs = result.scalars().all()
    return [{"id": n.id, "title": n.title, "body": n.body, "type": n.type, "is_read": n.is_read, "created_at": n.created_at.isoformat()} for n in notifs]

@notifications_router.put("/{notif_id}/read")
async def mark_read(notif_id: str, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Notification).where(Notification.id == notif_id, Notification.user_id == current_user.id))
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    await db.commit()
    return {"message": "Marked as read"}


# ── Privacy ────────────────────────────────────────────────────
privacy_router = APIRouter()

class PrivacyUpdateRequest(BaseModel):
    share_location: Optional[bool] = None
    share_health: Optional[bool] = None
    guardian_access: Optional[bool] = None
    share_emergency_info: Optional[bool] = None
    location_retention_days: Optional[int] = None
    health_retention_days: Optional[int] = None
    voice_processing: Optional[bool] = None
    push_notifications: Optional[bool] = None

@privacy_router.get("")
async def get_privacy(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PrivacySettings).where(PrivacySettings.user_id == current_user.id))
    ps = result.scalar_one_or_none()
    if not ps:
        return PrivacySettings.__table__.columns.keys()
    return {"share_location": ps.share_location, "share_health": ps.share_health, "guardian_access": ps.guardian_access, "share_emergency_info": ps.share_emergency_info, "location_retention_days": ps.location_retention_days, "health_retention_days": ps.health_retention_days, "voice_processing": ps.voice_processing, "push_notifications": ps.push_notifications}

@privacy_router.put("")
async def update_privacy(data: PrivacyUpdateRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PrivacySettings).where(PrivacySettings.user_id == current_user.id))
    ps = result.scalar_one_or_none()
    if not ps:
        ps = PrivacySettings(id=str(uuid.uuid4()), user_id=current_user.id)
        db.add(ps)
    for field, value in data.dict(exclude_none=True).items():
        setattr(ps, field, value)
    await db.commit()
    return {"message": "Privacy settings updated"}


# ── Safe Routes ────────────────────────────────────────────────
routes_router = APIRouter()

class RouteRequest(BaseModel):
    name: str
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    origin_address: Optional[str] = None
    destination_address: Optional[str] = None
    deviation_threshold_meters: Optional[float] = 300.0

@routes_router.get("")
async def list_routes(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SafeRoute).where(SafeRoute.user_id == current_user.id))
    routes = result.scalars().all()
    return [{"id": r.id, "name": r.name, "origin_address": r.origin_address, "destination_address": r.destination_address, "is_active": r.is_active} for r in routes]

@routes_router.post("", status_code=201)
async def create_route(data: RouteRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    route = SafeRoute(id=str(uuid.uuid4()), user_id=current_user.id, **data.dict())
    db.add(route)
    await db.commit()
    return {"id": route.id, "message": "Route created"}


# ── Facilities ─────────────────────────────────────────────────
facilities_router = APIRouter()

MOCK_FACILITIES = [
    {"name": "City General Hospital", "type": "hospital", "distance_m": 850, "address": "12 Main St", "phone": "+1-800-555-0100", "lat": 12.975, "lng": 77.598},
    {"name": "Metro Police Station", "type": "police", "distance_m": 1200, "address": "45 Park Ave", "phone": "+1-800-555-0911", "lat": 12.968, "lng": 77.591},
    {"name": "Central Clinic", "type": "clinic", "distance_m": 400, "address": "7 Health Lane", "phone": "+1-800-555-0200", "lat": 12.973, "lng": 77.597},
    {"name": "QuickMeds Pharmacy", "type": "pharmacy", "distance_m": 220, "address": "3 Market St", "phone": "+1-800-555-0300", "lat": 12.972, "lng": 77.596},
    {"name": "Fire & Rescue", "type": "fire_station", "distance_m": 2100, "address": "88 Emergency Blvd", "phone": "+1-800-555-0101", "lat": 12.980, "lng": 77.602},
]

@facilities_router.get("/nearby")
async def nearby_facilities(lat: Optional[float] = None, lng: Optional[float] = None, current_user: User = Depends(get_current_user)):
    # In production: call Overpass API or Google Places
    # For demo: return mock data
    return {"facilities": MOCK_FACILITIES, "source": "demo", "disclaimer": "Demonstration data only. Do not rely on for real emergencies."}


# ── Admin ──────────────────────────────────────────────────────
admin_router = APIRouter()

@admin_router.get("/dashboard")
async def admin_dashboard(admin: User = Depends(get_admin_user), db: AsyncSession = Depends(get_db)):
    user_count = await db.execute(select(User))
    all_users = user_count.scalars().all()
    event_result = await db.execute(select(EmergencyEvent).order_by(desc(EmergencyEvent.created_at)).limit(20))
    events = event_result.scalars().all()
    return {
        "total_users": len(all_users),
        "active_emergencies": len([e for e in events if e.status.value == "ACTIVE"]),
        "recent_events": [{"id": e.id, "trigger": e.trigger, "status": e.status, "risk_level": e.risk_level, "created_at": e.created_at.isoformat()} for e in events],
    }
