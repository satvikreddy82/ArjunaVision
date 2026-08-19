"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useStore } from "../../lib/store";
import { api } from "../../lib/api";

interface AdminStats {
  total_users: number;
  active_emergencies: number;
  recent_events: {
    id: string;
    trigger: string;
    status: string;
    risk_level: string;
    created_at: string;
  }[];
}

export default function AdminPage() {
  const { user } = useStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadStats = async () => {
    try {
      const res = await api.get("/admin/dashboard");
      setStats(res.data);
      setError("");
    } catch {
      setError("Failed to fetch admin stats. Ensure you are logged in as an admin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Nav */}
      <header className="bg-surface-container-low border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-on-surface-variant hover:text-on-surface text-sm">← Dashboard</Link>
          <span className="font-display font-bold text-lg">🖥️ Admin Control Panel</span>
          <span className="badge-primary text-xs">SYSTEM ADMIN</span>
        </div>
        <p className="text-xs text-on-surface-variant">{user?.name} (Admin)</p>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {error && (
          <div className="p-4 bg-tertiary-container/20 border border-tertiary-container/30 rounded-xl text-sm text-tertiary">
            ⚠ {error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="dashboard-card rounded-xl p-5">
            <p className="text-label-sm text-on-surface-variant mb-2">TOTAL REGISTERED USERS</p>
            <p className="font-display font-bold text-3xl text-primary">
              {loading ? "..." : stats?.total_users ?? 1}
            </p>
            <p className="text-xs text-on-surface-variant/60 mt-1">Across all roles</p>
          </div>
          <div className="dashboard-card rounded-xl p-5">
            <p className="text-label-sm text-on-surface-variant mb-2">ACTIVE EMERGENCIES</p>
            <p className="font-display font-bold text-3xl text-tertiary-container">
              {loading ? "..." : stats?.active_emergencies ?? 0}
            </p>
            <p className="text-xs text-on-surface-variant/60 mt-1">Currently requiring dispatch</p>
          </div>
          <div className="dashboard-card rounded-xl p-5">
            <p className="text-label-sm text-on-surface-variant mb-2">SYSTEM STATUS</p>
            <p className="font-display font-bold text-3xl text-secondary">HEALTHY</p>
            <p className="text-xs text-on-surface-variant/60 mt-1">All services online</p>
          </div>
        </div>

        {/* Recent Events */}
        <div className="dashboard-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">System-Wide Emergency Events</h3>
            <button onClick={loadStats} className="text-xs text-primary underline">Refresh</button>
          </div>

          {loading ? (
            <p className="text-sm text-on-surface-variant py-4">Loading system events...</p>
          ) : !stats?.recent_events || stats.recent_events.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-8">No emergency events logged in the system.</p>
          ) : (
            <div className="space-y-2">
              {stats.recent_events.map((e) => (
                <div key={e.id} className="flex items-center justify-between p-3 bg-surface-container rounded-lg text-sm">
                  <div>
                    <p className="font-semibold">{e.trigger.replace(/_/g, " ")}</p>
                    <p className="text-xs text-on-surface-variant">{new Date(e.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge-primary text-xs">{e.risk_level}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      e.status === "ACTIVE" ? "bg-tertiary-container/20 text-tertiary" : "bg-secondary/20 text-secondary"
                    }`}>{e.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
