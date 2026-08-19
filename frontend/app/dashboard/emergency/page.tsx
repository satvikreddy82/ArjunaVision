"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "../../../lib/store";
import { emergencyAPI, facilitiesAPI } from "../../../lib/api";

type TriggerType = "MANUAL_SOS" | "VOICE_SOS" | "FALL_DETECTION" | "HEALTH_ANOMALY" | "ROUTE_DEVIATION" | "INACTIVITY" | "SIMULATED_EMERGENCY";

interface Facility {
  name: string;
  type: string;
  distance_m: number;
  address: string;
  phone: string;
  lat: number;
  lng: number;
}

const FACILITY_ICONS: Record<string, string> = {
  hospital: "🏥",
  police: "👮",
  clinic: "🏨",
  pharmacy: "💊",
  fire_station: "🚒",
};

export default function EmergencyPage() {
  const {
    activeEmergency,
    setActiveEmergency,
    currentLocation,
    currentRisk,
    addNotification,
    isDemoMode,
    voiceActive,
    voiceText,
  } = useStore();

  const [phase, setPhase] = useState<"idle" | "confirm" | "active" | "resolved">("idle");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [pendingTrigger, setPendingTrigger] = useState<TriggerType>("MANUAL_SOS");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [fallAlert, setFallAlert] = useState(false);
  const [fallCountdown, setFallCountdown] = useState(15);
  const countdownRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (activeEmergency?.active) setPhase("active");
    else setPhase("idle");
  }, [activeEmergency]);

  const fetchFacilities = useCallback(async () => {
    try {
      const res = await facilitiesAPI.nearby(currentLocation?.latitude, currentLocation?.longitude);
      setFacilities(res.data.facilities || []);
    } catch { setFacilities([]); }
  }, [currentLocation]);

  useEffect(() => {
    if (phase === "active") fetchFacilities();
  }, [phase, fetchFacilities]);

  // ── SOS trigger ───────────────────────────────────────────
  const initiateSOS = (trigger: TriggerType = "MANUAL_SOS") => {
    setPendingTrigger(trigger);
    setPhase("confirm");
    setCountdown(5);

    // Auto-trigger after countdown
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current);
          triggerEmergency(trigger);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const cancelConfirm = () => {
    clearInterval(countdownRef.current);
    setPhase("idle");
    setFallAlert(false);
  };

  const triggerEmergency = async (trigger: TriggerType) => {
    setLoading(true);
    try {
      const res = await emergencyAPI.trigger({
        trigger,
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
        gps_available: !!currentLocation,
      });
      setActiveEmergency({ ...res.data, active: true });
      setPhase("active");
      addNotification({
        id: Date.now().toString(),
        title: "🚨 Emergency Activated",
        body: `${trigger.replace(/_/g, " ")} — Risk: ${res.data.risk_score}/100`,
        type: "EMERGENCY",
        is_read: false,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error(err);
      // Offline mode: show emergency UI anyway
      setActiveEmergency({
        event_id: "offline-" + Date.now(),
        trigger,
        status: "ACTIVE",
        active: true,
        risk_score: 95,
        risk_level: "CRITICAL",
        reasons: [trigger.replace(/_/g, " "), "Offline emergency — sync pending"],
        gps_available: !!currentLocation,
        latitude: currentLocation?.latitude,
        longitude: currentLocation?.longitude,
        started_at: new Date().toISOString(),
      } as Parameters<typeof setActiveEmergency>[0]);
      setPhase("active");
    } finally {
      setLoading(false);
    }
  };

  const cancelEmergency = async () => {
    if (!activeEmergency?.event_id) { setPhase("idle"); return; }
    try {
      await emergencyAPI.cancel(activeEmergency.event_id, "User confirmed safe");
      setActiveEmergency(null);
      setPhase("resolved");
      setTimeout(() => setPhase("idle"), 3000);
    } catch { setPhase("idle"); }
  };

  // ── Fall detection simulator ──────────────────────────────
  const simulateFall = () => {
    setFallAlert(true);
    setFallCountdown(15);
    const timer = setInterval(() => {
      setFallCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          setFallAlert(false);
          triggerEmergency("FALL_DETECTION");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const confirmSafe = () => {
    setFallAlert(false);
    setFallCountdown(15);
  };



  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl">Safety & SOS</h1>
          <p className="text-on-surface-variant text-sm">Emergency response system</p>
        </div>
        {isDemoMode && <span className="badge-warning">DEMO MODE</span>}
      </div>

      {/* ── Fall detection alert overlay ────────────────────── */}
      <AnimatePresence>
        {fallAlert && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="glass-card-elevated rounded-2xl p-8 max-w-sm w-full text-center border border-warning/30">
              <div className="text-6xl mb-4 animate-bounce">⚠️</div>
              <h2 className="font-display font-bold text-2xl text-warning mb-2">Possible Fall Detected</h2>
              <p className="text-on-surface-variant mb-4">Are you okay? Emergency will activate in:</p>
              <div className="text-6xl font-display font-black text-tertiary-container mb-6">{fallCountdown}</div>
              <p className="text-xs text-on-surface-variant mb-6">
                No response = emergency contacts alerted + emergency services shown
              </p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmSafe} className="btn-secondary py-4 text-lg font-bold">
                  ✅ I'm Safe — Cancel
                </button>
                <button onClick={() => { confirmSafe(); triggerEmergency("FALL_DETECTION"); }}
                  className="btn-danger py-3">
                  🆘 I Need Help
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confirm dialog ──────────────────────────────────── */}
      <AnimatePresence>
        {phase === "confirm" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="glass-card-elevated rounded-2xl p-8 max-w-sm w-full text-center border border-tertiary-container/30">
              <div className="text-5xl mb-4">🚨</div>
              <h2 className="font-display font-bold text-2xl text-tertiary-container mb-2">Activating Emergency</h2>
              <p className="text-on-surface-variant mb-4">
                Trigger: <strong className="text-on-surface">{pendingTrigger.replace(/_/g, " ")}</strong>
              </p>
              <div className="text-7xl font-display font-black text-tertiary-container mb-6">{countdown}</div>
              <div className="flex flex-col gap-3">
                <button onClick={cancelConfirm} className="btn-secondary py-3 text-base font-semibold">
                  Cancel — I'm Safe
                </button>
                <button onClick={() => { clearInterval(countdownRef.current); triggerEmergency(pendingTrigger); }}
                  disabled={loading} className="btn-danger py-3">
                  {loading ? "Activating…" : "Activate Now"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ACTIVE EMERGENCY ───────────────────────────────── */}
      {phase === "active" && activeEmergency && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl p-6 border border-tertiary-container/40 glow-emergency overflow-hidden relative"
          style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.12) 0%, rgba(225,29,72,0.06) 100%)" }}>
          <div className="absolute top-4 right-4">
            <span className="flex items-center gap-1.5 badge-danger animate-pulse">
              <span className="w-2 h-2 rounded-full bg-tertiary-container animate-ping" />
              ACTIVE
            </span>
          </div>
          <div className="text-5xl mb-4">🚨</div>
          <h2 className="font-display font-bold text-3xl text-tertiary-container mb-1">EMERGENCY ACTIVE</h2>
          <p className="text-on-surface-variant text-sm mb-4">
            Trigger: {activeEmergency.trigger?.replace(/_/g, " ")} · Risk: {activeEmergency.risk_score}/100
          </p>

          {/* Location info */}
          <div className="p-4 bg-surface-container/60 rounded-xl mb-4 space-y-2">
            {!activeEmergency.gps_available ? (
              <div>
                <span className="badge-warning text-xs mb-2 inline-flex">⚠ LAST KNOWN LOCATION</span>
                <p className="text-sm text-on-surface-variant">
                  GPS unavailable. Using last known location from{" "}
                  {activeEmergency.last_known_latitude?.toFixed(4)}, {activeEmergency.last_known_longitude?.toFixed(4)}
                </p>
                <p className="text-xs text-on-surface-variant/60 mt-1">
                  This location may not reflect current position. Emergency contacts have been notified.
                </p>
              </div>
            ) : (
              <div>
                <span className="badge-safe text-xs mb-2 inline-flex">📍 LIVE GPS</span>
                <p className="text-sm font-mono text-secondary">
                  {activeEmergency.latitude?.toFixed(6)}, {activeEmergency.longitude?.toFixed(6)}
                </p>
              </div>
            )}
          </div>

          {/* AI reasons */}
          {activeEmergency.reasons && activeEmergency.reasons.length > 0 && (
            <div className="p-4 bg-surface-container/40 rounded-xl mb-4">
              <p className="text-xs text-on-surface-variant font-semibold mb-2">🧠 Risk escalated because:</p>
              {activeEmergency.reasons.map((r: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-sm text-on-surface-variant py-1">
                  <span className="text-tertiary-container mt-0.5">•</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={cancelEmergency} className="flex-1 py-3 bg-surface-container rounded-xl font-semibold hover:bg-surface-container-high transition-colors text-sm">
              ✅ I'm Safe — Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Resolved ───────────────────────────────────────── */}
      {phase === "resolved" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass-card rounded-2xl p-8 text-center border border-secondary/30">
          <div className="text-5xl mb-3">✅</div>
          <h2 className="font-display font-bold text-2xl text-secondary">Emergency Cancelled</h2>
          <p className="text-on-surface-variant mt-2">You've confirmed you're safe. Returning to normal monitoring.</p>
        </motion.div>
      )}

      {/* ── Idle state — SOS buttons ───────────────────────── */}
      {phase === "idle" && (
        <>
          {/* Main SOS Button */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="flex justify-center py-8">
            <div className="relative">
              <button
                onClick={() => initiateSOS("MANUAL_SOS")}
                className="relative w-48 h-48 rounded-full bg-gradient-emergency text-white font-display font-black text-3xl
                  shadow-emergency hover:scale-105 active:scale-95 transition-transform duration-200 z-10 sos-pulse"
              >
                <span className="block">SOS</span>
                <span className="block text-sm font-normal opacity-80 mt-1">Press for Emergency</span>
              </button>
            </div>
          </motion.div>

          <p className="text-center text-xs text-on-surface-variant/50">
            Hold or press — a 5-second confirmation prevents accidental activation
          </p>

          {/* Other trigger options */}
          <div className="grid grid-cols-2 gap-3">
            {/* Voice SOS */}
            <button onClick={() => alert("Voice SOS is active in the background. Say 'Help me' or 'Emergency' at any time.")}
              className={`dashboard-card rounded-xl p-5 text-left hover:border-primary/20 transition-all ${voiceActive ? "border-primary/40 bg-primary/10" : ""}`}>
              <div className="text-3xl mb-3">🎙️</div>
              <h3 className="font-semibold text-sm mb-1">{voiceActive ? "Listening…" : "Voice SOS"}</h3>
              <p className="text-xs text-on-surface-variant">
                {voiceActive ? `"${voiceText || "Say: help me, emergency, SOS"}"` : 'Say "Help me" or "Emergency"'}
              </p>
              {voiceActive && (
                <div className="mt-2 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-1 bg-primary rounded-full animate-bounce" style={{ height: `${8 + Math.random() * 16}px`, animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              )}
            </button>

            {/* Fall Detection */}
            <button onClick={simulateFall}
              className="dashboard-card rounded-xl p-5 text-left hover:border-warning/20 transition-all">
              <div className="text-3xl mb-3">📡</div>
              <h3 className="font-semibold text-sm mb-1">
                {isDemoMode ? "Simulate Fall" : "Fall Detection"}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {isDemoMode ? "Demo: triggers fall workflow" : "Motion-based automatic detection"}
              </p>
            </button>

            {/* Health Anomaly */}
            <button onClick={() => initiateSOS("HEALTH_ANOMALY")}
              className="dashboard-card rounded-xl p-5 text-left hover:border-tertiary/20 transition-all">
              <div className="text-3xl mb-3">❤️</div>
              <h3 className="font-semibold text-sm mb-1">Health Alert</h3>
              <p className="text-xs text-on-surface-variant">Abnormal reading detected</p>
            </button>

            {/* Route Deviation */}
            <button onClick={() => initiateSOS("ROUTE_DEVIATION")}
              className="dashboard-card rounded-xl p-5 text-left hover:border-warning/20 transition-all">
              <div className="text-3xl mb-3">🗺️</div>
              <h3 className="font-semibold text-sm mb-1">Route Deviation</h3>
              <p className="text-xs text-on-surface-variant">Moved from planned route</p>
            </button>
          </div>
        </>
      )}

      {/* ── Nearby Facilities ──────────────────────────────── */}
      {(phase === "active" || facilities.length > 0) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span>🏥</span>
            <h3 className="font-display font-semibold text-sm">Nearby Emergency Facilities</h3>
            <span className="ml-auto text-xs text-on-surface-variant/50">Demo data only</span>
          </div>
          {facilities.length === 0 ? (
            <button onClick={fetchFacilities} className="w-full btn-ghost py-2 text-sm">Load Nearby Facilities</button>
          ) : (
            <div className="space-y-3">
              {facilities.map((f, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-surface-container rounded-lg">
                  <span className="text-2xl">{FACILITY_ICONS[f.type] || "📍"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{f.name}</p>
                    <p className="text-xs text-on-surface-variant">{f.address}</p>
                    <p className="text-xs text-secondary">{(f.distance_m / 1000).toFixed(1)} km away</p>
                  </div>
                  <a href={`tel:${f.phone}`}
                    className="flex-shrink-0 px-3 py-1.5 bg-secondary/20 text-secondary rounded-lg text-xs font-semibold hover:bg-secondary/30 transition-colors">
                    📞 Call
                  </a>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-on-surface-variant/40 mt-3 italic">
            ⚠ Demonstration data. Do not rely on for real emergencies. Always call 112/911.
          </p>
        </motion.div>
      )}
    </div>
  );
}
