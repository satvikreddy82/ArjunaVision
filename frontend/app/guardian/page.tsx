"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { emergencyAPI } from "@/lib/api";

interface GuardianEvent {
  id: string;
  trigger?: string;
  status?: string;
  risk_score?: number;
  risk_level?: string;
  latitude?: number;
  longitude?: number;
  created_at?: string;
}

const RISK_COLOR: Record<string, string> = { LOW: "text-secondary", MEDIUM: "text-warning", HIGH: "text-orange-400", CRITICAL: "text-tertiary-container" };
const STATUS_BADGE: Record<string, string> = { ACTIVE: "badge-danger", RESOLVED: "badge-safe", CANCELLED: "badge-muted" };

export default function GuardianDashboard() {
  const { user, activeEmergency, currentRisk } = useStore();
  const [events, setEvents] = useState<GuardianEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await emergencyAPI.history();
        setEvents(res.data.slice(0, 20));
      } catch { /* offline */ } finally { setLoading(false); }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Nav */}
      <header className="bg-surface-container-low border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-on-surface-variant hover:text-on-surface text-sm">← Dashboard</Link>
          <span className="font-display font-bold text-lg">👁️ Guardian Dashboard</span>
          <span className="badge-primary text-xs">REAL-TIME</span>
        </div>
        <p className="text-xs text-on-surface-variant">{user?.name}</p>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Active emergency banner */}
        {activeEmergency && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-6 border border-tertiary-container/40 glow-emergency"
            style={{ background: "linear-gradient(135deg, rgba(220,38,38,0.1) 0%, rgba(225,29,72,0.05) 100%)" }}>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-3 h-3 rounded-full bg-tertiary-container animate-ping" />
              <h2 className="font-display font-bold text-xl text-tertiary-container">🚨 EMERGENCY ACTIVE</h2>
              <span className="badge-danger">LIVE</span>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-on-surface-variant">Trigger</p>
                <p className="font-semibold text-sm">{(activeEmergency.trigger as string)?.replace(/_/g, " ")}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Risk Score</p>
                <p className={`font-display font-bold text-xl ${RISK_COLOR[activeEmergency.risk_level as string] || "text-on-surface"}`}>
                  {activeEmergency.risk_score}/100
                </p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant">Location</p>
                {activeEmergency.gps_available ? (
                  <p className="font-mono text-secondary text-sm">{(activeEmergency.latitude as number)?.toFixed(4)}, {(activeEmergency.longitude as number)?.toFixed(4)}</p>
                ) : (
                  <p className="text-warning text-sm">⚠ GPS Unavailable — Last Known</p>
                )}
              </div>
            </div>
            {activeEmergency.reasons && (
              <div className="mt-4 p-3 bg-surface-container/60 rounded-xl">
                <p className="text-xs font-semibold text-primary mb-2">🧠 AI Risk Assessment</p>
                {(activeEmergency.reasons as string[]).map((r: string, i: number) => (
                  <p key={i} className="text-xs text-on-surface-variant">→ {r}</p>
                ))}
              </div>
            )}
            <Link href="/dashboard/emergency" className="mt-4 btn-danger inline-block text-sm py-2 px-5">
              View Emergency Details →
            </Link>
          </motion.div>
        )}

        {/* Status overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Current Risk", value: `${currentRisk.risk_score}/100`, sub: currentRisk.risk_level, color: RISK_COLOR[currentRisk.risk_level] },
            { label: "Active Emergencies", value: activeEmergency ? "1" : "0", sub: activeEmergency ? "Needs Attention" : "All Clear", color: activeEmergency ? "text-tertiary-container" : "text-secondary" },
            { label: "Total Events", value: events.length.toString(), sub: "In history", color: "text-primary" },
            { label: "Status", value: activeEmergency ? "EMERGENCY" : "SAFE", sub: "Current state", color: activeEmergency ? "text-tertiary-container" : "text-secondary" },
          ].map((stat) => (
            <div key={stat.label} className="dashboard-card rounded-xl p-4">
              <p className="text-label-sm text-on-surface-variant mb-2">{stat.label}</p>
              <p className={`font-display font-bold text-xl ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-on-surface-variant/60">{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Event history */}
        <div className="dashboard-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">Recent Emergency Events</h3>
            <span className="text-xs text-on-surface-variant">Auto-refreshes every 15s</span>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-surface-container rounded-xl animate-pulse" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold mb-1">No Emergency Events</p>
              <p className="text-sm text-on-surface-variant">Run a demo scenario to see events here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map((e, i) => (
                <motion.div key={e.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-4 p-4 bg-surface-container rounded-xl">
                  <div className="shrink-0">
                    <span className={`font-display font-bold text-base ${RISK_COLOR[e.risk_level || "LOW"]}`}>
                      {e.risk_score}/100
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{e.trigger?.replace(/_/g, " ") || "Emergency"}</p>
                    <p className="text-xs text-on-surface-variant">{e.created_at ? new Date(e.created_at).toLocaleString() : ""}</p>
                  </div>
                  <span className={STATUS_BADGE[e.status || ""] || "badge-muted"}>
                    {e.status}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-on-surface-variant/40 text-center">
          Guardian dashboard shows events for your account. Family members must be added as guardians to view others' dashboards.
        </p>
      </div>
    </div>
  );
}
