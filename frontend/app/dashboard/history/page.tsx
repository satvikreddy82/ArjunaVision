"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { emergencyAPI, notificationsAPI } from "@/lib/api";
import { useStore } from "@/lib/store";

type TimelineType = "EMERGENCY" | "HEALTH" | "LOCATION" | "SYSTEM" | "ALL";

const TYPE_ICONS: Record<string, string> = { EMERGENCY: "🚨", HEALTH: "❤️", LOCATION: "📍", SYSTEM: "⚙️", WARNING: "⚠️", INFO: "ℹ️" };
const TYPE_COLORS: Record<string, string> = { EMERGENCY: "text-tertiary-container", HEALTH: "text-tertiary", LOCATION: "text-sky-400", SYSTEM: "text-on-surface-variant", WARNING: "text-warning" };

interface AlertEvent {
  id: string;
  type?: string;
  title?: string;
  body?: string;
  trigger?: string;
  status?: string;
  risk_level?: string;
  risk_score?: number;
  created_at?: string;
}

export default function HistoryPage() {
  const { notifications, setNotifications } = useStore();
  const [filter, setFilter] = useState<TimelineType>("ALL");
  const [emergencyHistory, setEmergencyHistory] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [nRes, eRes] = await Promise.all([notificationsAPI.list(), emergencyAPI.history()]);
        setNotifications(nRes.data);
        setEmergencyHistory(eRes.data);
      } catch { /* offline */ } finally { setLoading(false); }
    };
    loadData();
  }, [setNotifications]);

  const allEvents: AlertEvent[] = [
    ...notifications.map((n) => ({ ...n, type: n.type || "INFO" })),
    ...emergencyHistory.map((e) => ({ id: e.id, type: "EMERGENCY", title: `Emergency: ${e.trigger?.replace(/_/g, " ")}`, body: `Risk: ${e.risk_score}/100 · ${e.status}`, created_at: e.created_at })),
  ].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

  const filtered = filter === "ALL" ? allEvents : allEvents.filter((e) => e.type === filter);

  const markRead = async (id: string) => {
    try { await notificationsAPI.markRead(id); } catch { /* ignore */ }
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl">Alert History</h1>
        <p className="text-on-surface-variant text-sm">Timeline of all safety events and notifications</p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {(["ALL", "EMERGENCY", "HEALTH", "LOCATION", "SYSTEM"] as TimelineType[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              filter === f ? "bg-primary/20 text-primary border border-primary/30" : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}>
            {f === "ALL" ? "All Events" : `${TYPE_ICONS[f] || ""} ${f}`}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="dashboard-card rounded-xl p-4 animate-pulse">
              <div className="h-3 bg-surface-container rounded w-1/3 mb-2" />
              <div className="h-4 bg-surface-container rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="dashboard-card rounded-xl p-12 text-center">
          <div className="text-5xl mb-4">📋</div>
          <p className="font-display font-semibold text-lg mb-2">No Events Yet</p>
          <p className="text-on-surface-variant text-sm">Events will appear here as you use ArjunaVision.</p>
        </div>
      ) : (
        <div className="relative space-y-2">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-white/5" />

          {filtered.map((event, i) => (
            <motion.div key={event.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className="relative flex items-start gap-4 pl-12"
              onClick={() => markRead(event.id)}>
              {/* Timeline dot */}
              <div className={`absolute left-4 w-4 h-4 rounded-full border-2 border-background flex items-center justify-center ${
                event.type === "EMERGENCY" ? "bg-tertiary-container" : event.type === "HEALTH" ? "bg-tertiary" : "bg-primary"
              }`} />

              <div className="flex-1 dashboard-card rounded-xl p-4 cursor-pointer hover:border-white/10 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span>{TYPE_ICONS[event.type || "INFO"] || "•"}</span>
                    <p className={`font-semibold text-sm ${TYPE_COLORS[event.type || "INFO"] || "text-on-surface"}`}>
                      {event.title || event.type}
                    </p>
                  </div>
                  <p className="text-xs text-on-surface-variant/60 shrink-0">
                    {event.created_at ? new Date(event.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                  </p>
                </div>
                {event.body && <p className="text-xs text-on-surface-variant mt-1 ml-7">{event.body}</p>}
                <p className="text-xs text-on-surface-variant/40 mt-1 ml-7">
                  {event.created_at ? new Date(event.created_at).toLocaleDateString() : ""}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
