"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useStore } from "../../lib/store";
import { healthAPI, locationAPI, emergencyAPI, riskAPI, simulationAPI } from "../../lib/api";
import Link from "next/link";

// ─── Helper components ────────────────────────────────────────
function StatusHero({ status, riskScore, riskLevel }: { status: string; riskScore: number; riskLevel: string }) {
  const isEmergency = status === "EMERGENCY";
  const isHighRisk = riskLevel === "HIGH" || riskLevel === "CRITICAL";

  return (
    <div className={`dashboard-card rounded-2xl p-8 flex flex-col items-center text-center relative overflow-hidden
      ${isEmergency ? "border-tertiary-container/40 glow-emergency animate-sos-glow" : isHighRisk ? "border-warning/30" : "animate-pulse-glow"}`}
    >
      {/* Background glow */}
      <div className={`absolute inset-0 opacity-10 ${
        isEmergency ? "bg-gradient-emergency" : isHighRisk ? "bg-gradient-warning" : "bg-gradient-secondary"
      } pointer-events-none`} />

      <div className={`relative w-20 h-20 rounded-full flex items-center justify-center mb-4 text-4xl
        ${isEmergency ? "bg-tertiary-container/20" : isHighRisk ? "bg-warning/20" : "bg-secondary/20"}`}>
        {isEmergency ? "🚨" : isHighRisk ? "⚠️" : "✅"}
        {isEmergency && (
          <>
            <span className="absolute inset-0 rounded-full border-2 border-tertiary-container/50 animate-sos-ring" />
            <span className="absolute inset-0 rounded-full border-2 border-tertiary-container/30 animate-sos-ring" style={{ animationDelay: "0.5s" }} />
          </>
        )}
      </div>

      <h2 className={`font-display font-bold text-5xl mb-2 ${
        isEmergency ? "text-tertiary-container" : isHighRisk ? "text-warning" : "text-secondary"
      }`}>
        {status}
      </h2>
      <p className="text-on-surface-variant text-sm">
        AI Risk Score: <span className="font-bold text-on-surface">{riskScore}/100</span>
      </p>
      <div className="w-full mt-4 h-2 bg-surface-container-high rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${
            isEmergency ? "bg-gradient-emergency" : isHighRisk ? "bg-gradient-warning" : "bg-gradient-primary"
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${riskScore}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function QuickStatCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="dashboard-card rounded-xl p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">{label}</span>
      </div>
      <span className={`font-display font-bold text-2xl ${color || "text-on-surface"}`}>{value}</span>
      {sub && <span className="text-xs text-on-surface-variant">{sub}</span>}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────
export default function DashboardPage() {
  const {
    safetyStatus, currentRisk, latestHealthReading, currentLocation,
    activeEmergency, setCurrentRisk, setCurrentLocation, addHealthReading,
    setActiveEmergency, isDemoMode, setDemoMode, user,
  } = useStore();

  const [seedLoading, setSeedLoading] = useState(false);
  const [seedDone, setSeedDone] = useState(false);
  const [locationError, setLocationError] = useState(false);

  // Fetch active emergency
  const pollEmergency = useCallback(async () => {
    try {
      const res = await emergencyAPI.active();
      if (res.data.active) setActiveEmergency(res.data);
      else setActiveEmergency(null);
    } catch { /* ignore */ }
  }, [setActiveEmergency]);

  // Request GPS
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationError(true); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date().toISOString(),
          is_last_known: true,
          available: true,
        };
        setCurrentLocation(loc);
        setLocationError(false);
        try { await locationAPI.update(loc.latitude, loc.longitude); } catch { /* offline */ }
      },
      () => setLocationError(true),
      { timeout: 8000 }
    );
  }, [setCurrentLocation]);

  // Simulate health reading
  const simulateHealthReading = useCallback(() => {
    const hr = 65 + Math.random() * 20;
    const reading = {
      heart_rate: parseFloat(hr.toFixed(1)),
      systolic_bp: 115 + Math.random() * 15,
      diastolic_bp: 75 + Math.random() * 10,
      blood_oxygen: 97 + Math.random() * 2,
      steps: Math.floor(Math.random() * 300),
      activity_level: "RESTING",
      is_anomaly: false,
      timestamp: new Date().toISOString(),
    };
    addHealthReading(reading);
  }, [addHealthReading]);

  useEffect(() => {
    requestLocation();
    simulateHealthReading();
    pollEmergency();
    const interval = setInterval(() => { simulateHealthReading(); pollEmergency(); }, 30000);
    return () => clearInterval(interval);
  }, [requestLocation, simulateHealthReading, pollEmergency]);

  const handleSeedData = async () => {
    setSeedLoading(true);
    try {
      await simulationAPI.seedDemoData();
      setSeedDone(true);
      setDemoMode(true);
    } catch (e) {
      console.error("Seed failed:", e);
    } finally {
      setSeedLoading(false);
    }
  };

  const reasons = currentRisk.reasons || [];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* ── Welcome ────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h1 className="font-display font-bold text-2xl text-on-surface">
          Welcome back, {user?.name?.split(" ")[0] || "Guardian"} 👋
        </h1>
        <p className="text-on-surface-variant text-sm mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · Your safety dashboard
        </p>
      </motion.div>

      {/* ── Demo quick-start ───────────────────────────────────── */}
      {!isDemoMode && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary">🎬 Hackathon Demo</p>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Seed realistic demo data and enable simulation mode for the full demo experience.
            </p>
          </div>
          <button onClick={handleSeedData} disabled={seedLoading || seedDone}
            className="btn-primary text-sm py-2 px-5 whitespace-nowrap disabled:opacity-60">
            {seedLoading ? "Seeding…" : seedDone ? "✓ Data Ready" : "Seed Demo Data"}
          </button>
          <Link href="/demo" className="btn-ghost text-sm py-2 px-5 whitespace-nowrap text-center">Launch Demo</Link>
        </motion.div>
      )}

      {/* ── Status hero ────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <StatusHero status={safetyStatus} riskScore={currentRisk.risk_score} riskLevel={currentRisk.risk_level} />
      </motion.div>

      {/* ── Quick stats bento grid ─────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <QuickStatCard icon="❤️" label="Heart Rate" value={`${latestHealthReading?.heart_rate?.toFixed(0) || "72"} BPM`} sub="Normal range" color="text-tertiary-container" />
        <QuickStatCard icon="🩸" label="SpO₂" value={`${latestHealthReading?.blood_oxygen?.toFixed(0) || "98"}%`} sub="Good" color="text-secondary" />
        <QuickStatCard icon="📍" label="Location"
          value={locationError ? "GPS Unavailable" : "Live"}
          sub={locationError ? "Showing last known" : `±${currentLocation?.accuracy?.toFixed(0) || "?"}m`}
          color={locationError ? "text-warning" : "text-secondary"} />
        <QuickStatCard icon="🔋" label="Network" value="ONLINE" sub="All systems active" color="text-secondary" />
      </motion.div>

      {/* ── AI Explanation ─────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
        className="dashboard-card rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🧠</span>
          <h3 className="font-display font-semibold text-base">Why this risk level?</h3>
          <span className="ml-auto badge-primary text-xs">Explainable AI</span>
        </div>
        {reasons.map((r, i) => (
          <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
            <span className="mt-0.5 text-primary">→</span>
            <p className="text-sm text-on-surface-variant">{r}</p>
          </div>
        ))}
        <p className="text-xs text-on-surface-variant/50 mt-3 italic">
          Recommended: {currentRisk.recommended_action}
        </p>
      </motion.div>

      {/* ── Quick actions ──────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: "/dashboard/emergency", label: "Emergency SOS", icon: "🆘", danger: true },
          { href: "/dashboard/health", label: "Health Monitor", icon: "❤️" },
          { href: "/dashboard/location", label: "Location Trail", icon: "📍" },
          { href: "/demo", label: "Run Demo", icon: "🎬" },
        ].map((action) => (
          <Link key={action.href} href={action.href}
            className={`flex flex-col items-center gap-2 p-5 rounded-xl text-center border transition-all hover:scale-[1.02] active:scale-[0.98]
              ${action.danger
                ? "bg-gradient-emergency/10 border-tertiary-container/30 hover:border-tertiary-container/50"
                : "glass-card hover:border-white/10"}`}>
            <span className="text-3xl">{action.icon}</span>
            <span className="text-sm font-semibold text-on-surface">{action.label}</span>
          </Link>
        ))}
      </motion.div>

      {/* ── Location card ──────────────────────────────────────── */}
      {(currentLocation || locationError) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="dashboard-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span>📍</span>
            <h3 className="font-display font-semibold text-sm">
              {locationError ? "⚠ Last Known Location" : "Current Location"}
            </h3>
            {locationError && <span className="badge-warning text-xs">LAST KNOWN</span>}
          </div>
          {currentLocation ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-on-surface-variant text-xs mb-1">Latitude</p>
                <p className="font-mono text-primary">{currentLocation.latitude.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-on-surface-variant text-xs mb-1">Longitude</p>
                <p className="font-mono text-primary">{currentLocation.longitude.toFixed(6)}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">
              Current GPS unavailable. <Link href="/dashboard/location" className="text-primary underline">View last known →</Link>
            </p>
          )}
          <div className="mt-3 pt-3 border-t border-white/5 text-xs text-on-surface-variant/60">
            Last updated: {currentLocation ? new Date(currentLocation.timestamp).toLocaleTimeString() : "—"}
          </div>
        </motion.div>
      )}

      {/* ── Safety disclaimer ──────────────────────────────────── */}
      <div className="text-xs text-on-surface-variant/40 text-center pb-4">
        AI risk scores are safety indicators, not medical diagnosis. For emergencies, call 112 / 911.
      </div>
    </div>
  );
}
