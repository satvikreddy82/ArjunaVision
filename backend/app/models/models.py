"""SQLAlchemy ORM Models for ArjunaVision"""
import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Integer, Boolean, DateTime,
    ForeignKey, Text, JSON, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship as orm_relationship
from app.database import Base
import enum


def gen_uuid():
    return str(uuid.uuid4())


# ─────────────────────────────── Enums ────────────────────────────────────
class RiskLevel(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class EmergencyTrigger(str, enum.Enum):
    MANUAL_SOS = "MANUAL_SOS"
    VOICE_SOS = "VOICE_SOS"
    FALL_DETECTION = "FALL_DETECTION"
    HEALTH_ANOMALY = "HEALTH_ANOMALY"
    ROUTE_DEVIATION = "ROUTE_DEVIATION"
    INACTIVITY = "INACTIVITY"
    MULTI_SIGNAL = "MULTI_SIGNAL"
    SIMULATED_EMERGENCY = "SIMULATED_EMERGENCY"


class EmergencyStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    RESOLVED = "RESOLVED"
    CANCELLED = "CANCELLED"
    FALSE_ALARM = "FALSE_ALARM"


class AnomalyType(str, enum.Enum):
    NORMAL = "NORMAL"
    UNUSUAL = "UNUSUAL"
    HIGH_RISK = "HIGH_RISK"


# ─────────────────────────────── Tables ───────────────────────────────────
class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    role = Column(String, default="user")  # user | guardian | admin
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    profile = orm_relationship("Profile", back_populates="user", uselist=False)
    locations = orm_relationship("Location", back_populates="user")
    emergency_contacts = orm_relationship("EmergencyContact", back_populates="user")
    emergency_events = orm_relationship("EmergencyEvent", back_populates="user")
    health_readings = orm_relationship("HealthReading", back_populates="user")
    risk_assessments = orm_relationship("RiskAssessment", back_populates="user")
    safe_routes = orm_relationship("SafeRoute", back_populates="user")
    notifications = orm_relationship("Notification", back_populates="user")
    privacy_settings = orm_relationship("PrivacySettings", back_populates="user", uselist=False)


class Profile(Base):
    __tablename__ = "profiles"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    name = Column(String, nullable=False)
    phone = Column(String)
    date_of_birth = Column(String)
    profile_photo_url = Column(String)
    blood_group = Column(String)
    allergies = Column(Text)
    medical_notes = Column(Text)
    emergency_phrase = Column(String, default="help me")
    safety_sensitivity = Column(String, default="MEDIUM")  # LOW | MEDIUM | HIGH
    created_at = Column(DateTime, default=datetime.utcnow)

    user = orm_relationship("User", back_populates="profile")


class EmergencyContact(Base):
    __tablename__ = "emergency_contacts"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    email = Column(String)
    relationship = Column(String)  # Parent | Sibling | Friend | Guardian | Other
    priority = Column(Integer, default=1)
    notify_on_emergency = Column(Boolean, default=True)
    notify_on_warning = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = orm_relationship("User", back_populates="emergency_contacts")


class Location(Base):
    __tablename__ = "locations"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String)
    accuracy = Column(Float)
    is_last_known = Column(Boolean, default=False)
    source = Column(String, default="GPS")  # GPS | NETWORK | MANUAL
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = orm_relationship("User", back_populates="locations")


class EmergencyEvent(Base):
    __tablename__ = "emergency_events"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    trigger = Column(SAEnum(EmergencyTrigger))
    status = Column(SAEnum(EmergencyStatus), default=EmergencyStatus.ACTIVE)
    latitude = Column(Float)
    longitude = Column(Float)
    last_known_latitude = Column(Float)
    last_known_longitude = Column(Float)
    address = Column(String)
    risk_score = Column(Float)
    risk_level = Column(SAEnum(RiskLevel))
    signals = Column(JSON)  # list of signal reasons
    health_snapshot = Column(JSON)
    device_status = Column(JSON)
    notes = Column(Text)
    resolved_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = orm_relationship("User", back_populates="emergency_events")


class HealthReading(Base):
    __tablename__ = "health_readings"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    heart_rate = Column(Float)
    systolic_bp = Column(Float)
    diastolic_bp = Column(Float)
    blood_oxygen = Column(Float)
    steps = Column(Integer)
    activity_level = Column(String)  # RESTING | LIGHT | MODERATE | VIGOROUS
    sleep_hours = Column(Float)
    is_anomaly = Column(Boolean, default=False)
    anomaly_type = Column(SAEnum(AnomalyType), default=AnomalyType.NORMAL)
    source = Column(String, default="SIMULATED")
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = orm_relationship("User", back_populates="health_readings")


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    risk_score = Column(Float, nullable=False)
    risk_level = Column(SAEnum(RiskLevel), nullable=False)
    signals = Column(JSON)  # {"fall": bool, "inactivity": bool, "health_anomaly": bool, ...}
    reasons = Column(JSON)  # list of human-readable explanation strings
    recommended_action = Column(String)
    ml_prediction = Column(JSON)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = orm_relationship("User", back_populates="risk_assessments")


class SafeRoute(Base):
    __tablename__ = "safe_routes"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    name = Column(String)
    origin_lat = Column(Float)
    origin_lng = Column(Float)
    destination_lat = Column(Float)
    destination_lng = Column(Float)
    origin_address = Column(String)
    destination_address = Column(String)
    is_active = Column(Boolean, default=False)
    deviation_threshold_meters = Column(Float, default=300.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = orm_relationship("User", back_populates="safe_routes")


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    title = Column(String, nullable=False)
    body = Column(Text)
    type = Column(String)  # EMERGENCY | WARNING | INFO | HEALTH | LOCATION | SYSTEM
    is_read = Column(Boolean, default=False)
    data = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = orm_relationship("User", back_populates="notifications")


class PrivacySettings(Base):
    __tablename__ = "privacy_settings"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), unique=True)
    share_location = Column(Boolean, default=True)
    share_health = Column(Boolean, default=False)
    guardian_access = Column(Boolean, default=True)
    share_emergency_info = Column(Boolean, default=True)
    location_retention_days = Column(Integer, default=30)
    health_retention_days = Column(Integer, default=90)
    voice_processing = Column(Boolean, default=True)
    push_notifications = Column(Boolean, default=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = orm_relationship("User", back_populates="privacy_settings")


class DeviceStatus(Base):
    __tablename__ = "device_status"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"))
    battery_level = Column(Float)
    is_charging = Column(Boolean)
    network_type = Column(String)  # WIFI | CELLULAR | OFFLINE
    is_online = Column(Boolean, default=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    resource = Column(String)
    details = Column(JSON)
    ip_address = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
