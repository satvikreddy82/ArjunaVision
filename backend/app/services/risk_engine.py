"""Risk Engine — Modular signal-based risk scoring"""
from dataclasses import dataclass, field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class RiskSignals:
    manual_sos: bool = False
    voice_sos: bool = False
    fall_detected: bool = False
    fall_confirmed: bool = False          # user pressed I'm okay
    health_anomaly: bool = False
    health_anomaly_severity: float = 0.0  # 0–1
    movement_anomaly: bool = False
    route_deviation: bool = False
    inactivity: bool = False
    no_response_to_check: bool = False
    gps_unavailable: bool = False
    low_battery: bool = False
    device_offline: bool = False
    checkin_overdue: bool = False
    multiple_signals: bool = False


@dataclass
class RiskResult:
    risk_score: float
    risk_level: RiskLevel
    reasons: List[str]
    signals: dict
    recommended_action: str
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())


# Signal weights (must sum <= 100 logically)
WEIGHTS = {
    "manual_sos": 100,
    "voice_sos": 100,
    "fall_confirmed": -30,          # negative — user said they're okay
    "fall_detected": 40,
    "health_anomaly": 25,
    "movement_anomaly": 15,
    "route_deviation": 20,
    "inactivity": 20,
    "no_response_to_check": 25,
    "gps_unavailable": 5,
    "low_battery": 5,
    "device_offline": 10,
    "checkin_overdue": 20,
}

REASON_MESSAGES = {
    "manual_sos": "User manually triggered SOS",
    "voice_sos": "Voice emergency command detected",
    "fall_detected": "Possible fall detected by motion sensors",
    "health_anomaly": "Health reading deviates significantly from personal baseline",
    "movement_anomaly": "Unusual movement pattern detected",
    "route_deviation": "User has moved significantly away from the planned safe route",
    "inactivity": "Prolonged inactivity detected",
    "no_response_to_check": "User did not respond to the safety check",
    "gps_unavailable": "GPS location is currently unavailable",
    "low_battery": "Device battery is critically low",
    "device_offline": "Device has gone offline",
    "checkin_overdue": "Safety check-in is overdue",
}


def analyze_risk(signals: RiskSignals, ml_score: Optional[float] = None) -> RiskResult:
    """
    Compute risk score from signals.
    ml_score: optional 0–1 score from ML service, blended 30% into final score.
    """
    # Immediate emergencies
    if signals.manual_sos or signals.voice_sos:
        active_reasons = []
        if signals.manual_sos:
            active_reasons.append(REASON_MESSAGES["manual_sos"])
        if signals.voice_sos:
            active_reasons.append(REASON_MESSAGES["voice_sos"])
        return RiskResult(
            risk_score=100.0,
            risk_level=RiskLevel.CRITICAL,
            reasons=active_reasons,
            signals=signals.__dict__,
            recommended_action="Emergency workflow activated. Alerting emergency contacts and locating nearby facilities.",
        )

    # If user confirmed safety after fall, reduce weight
    score = 0.0
    active_reasons = []

    for signal_name, weight in WEIGHTS.items():
        if signal_name == "fall_confirmed":
            if signals.fall_confirmed:
                score += weight  # negative weight
        elif getattr(signals, signal_name, False):
            score += weight
            if signal_name in REASON_MESSAGES:
                active_reasons.append(REASON_MESSAGES[signal_name])

    # Boost if multiple non-SOS signals
    active_signal_count = sum([
        signals.fall_detected,
        signals.health_anomaly,
        signals.movement_anomaly,
        signals.route_deviation,
        signals.inactivity,
        signals.no_response_to_check,
        signals.checkin_overdue,
    ])
    if active_signal_count >= 3:
        score += 15
        active_reasons.append("Multiple concurrent risk signals detected")

    # Blend ML score if available
    if ml_score is not None:
        score = score * 0.7 + (ml_score * 100) * 0.3

    score = max(0.0, min(100.0, score))

    # Determine level
    if score >= 80:
        level = RiskLevel.CRITICAL
        action = "Emergency workflow activated. Alerting emergency contacts."
    elif score >= 55:
        level = RiskLevel.HIGH
        action = "High risk detected. Safety check initiated. Emergency contacts notified."
    elif score >= 30:
        level = RiskLevel.MEDIUM
        action = "Monitoring elevated. Location tracking increased. Safety check pending."
    else:
        level = RiskLevel.LOW
        action = "Continue normal monitoring. Everything appears safe."

    if not active_reasons:
        active_reasons = ["All signals within normal range"]

    return RiskResult(
        risk_score=round(score, 1),
        risk_level=level,
        reasons=active_reasons,
        signals=signals.__dict__,
        recommended_action=action,
    )
