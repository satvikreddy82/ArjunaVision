"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts";
import { useStore } from "@/lib/store";
import { healthAPI } from "@/lib/api";

interface HealthData {
  timestamp?: string;
  heart_rate?: number;
  systolic_bp?: number;
  blood_oxygen?: number;
  steps?: number;
  is_anomaly?: boolean;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (active && payload?.length) {
    return (
      <div className="custom-tooltip">
        <p className="text-on-surface-variant text-xs mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="font-semibold">{p.name}: <span className="text-primary">{p.value?.toFixed(1)}</span></p>
        ))}
      </div>
    );
  }
  return null;
};

function SimulatedReading() {
  const { addHealthReading, latestHealthReading } = useStore();
  const [simulating, setSimulating] = useState(false);

  const simulate = async (type: "normal" | "anomaly") => {
    setSimulating(true);
    const reading: HealthData = type === "normal"
      ? { heart_rate: 68 + Math.random() * 12, systolic_bp: 116 + Math.random() * 8, blood_oxygen: 97.5 + Math.random() * 1.5, steps: Math.floor(Math.random() * 200), is_anomaly: false }
      : { heart_rate: 135 + Math.random() * 20, systolic_bp: 158 + Math.random() * 15, blood_oxygen: 91 + Math.random() * 2, steps: 0, is_anomaly: true };
    reading.timestamp = new Date().toISOString();
    addHealthReading(reading as Parameters<typeof addHealthReading>[0]);
    try {
      await healthAPI.addReading({ ...reading, source: "SIMULATED", activity_level: "RESTING" });
    } catch { /* offline */ }
    setTimeout(() => setSimulating(false), 500);
  };

  return (
    <div className="flex gap-2">
      <button onClick={() => simulate("normal")} disabled={simulating}
        className="flex-1 btn-ghost text-sm py-2">Simulate Normal</button>
      <button onClick={() => simulate("anomaly")} disabled={simulating}
        className="flex-1 py-2 px-4 border border-tertiary-container/30 text-tertiary-container rounded-lg text-sm font-semibold hover:bg-tertiary-container/10 transition-colors">
        Simulate Anomaly
      </button>
    </div>
  );
}

export default function HealthPage() {
  const { healthHistory, latestHealthReading, isDemoMode } = useStore();
  const [readings, setReadings] = useState<HealthData[]>([]);
  const [baseline, setBaseline] = useState<{ avg_hr?: number; avg_systolic?: number } | null>(null);
  const [anomalies, setAnomalies] = useState<HealthData[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [rRes, bRes, aRes] = await Promise.all([healthAPI.readings(48), healthAPI.baseline(), healthAPI.anomalies()]);
      setReadings(rRes.data.slice(0, 100));
      setBaseline(bRes.data);
      setAnomalies(aRes.data.slice(0, 10));
    } catch {
      // Use local store data
      setReadings(healthHistory.slice(0, 100));
    }
  }, [healthHistory]);

  useEffect(() => { loadData(); }, [loadData]);

  const chartData = [...readings].reverse().slice(-48).map((r) => ({
    time: r.timestamp ? new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
    hr: r.heart_rate ? parseFloat(r.heart_rate.toFixed(1)) : null,
    bp: r.systolic_bp ? parseFloat(r.systolic_bp.toFixed(1)) : null,
    spo2: r.blood_oxygen ? parseFloat(r.blood_oxygen.toFixed(1)) : null,
  }));

  const latest = latestHealthReading;
  const isAnomaly = latest?.is_anomaly;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl">Health & AI Insights</h1>
        <p className="text-on-surface-variant text-sm">Personal baseline monitoring — not medical diagnosis</p>
      </div>

      {/* Latest readings */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: "❤️", label: "Heart Rate", value: `${latest?.heart_rate?.toFixed(0) || "--"} BPM`, normal: !isAnomaly, range: "60–100" },
          { icon: "🩸", label: "Systolic BP", value: `${latest?.systolic_bp?.toFixed(0) || "--"} mmHg`, normal: !isAnomaly, range: "<130" },
          { icon: "💧", label: "Blood O₂", value: `${latest?.blood_oxygen?.toFixed(0) || "--"}%`, normal: !isAnomaly, range: ">95%" },
          { icon: "👟", label: "Steps", value: `${latest?.steps || 0}`, normal: true, range: "Today" },
        ].map((stat) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`dashboard-card rounded-xl p-5 ${isAnomaly && stat.label !== "Steps" ? "border-tertiary-container/30 bg-tertiary-container/5" : ""}`}>
            <div className="flex items-center gap-2 mb-2">
              <span>{stat.icon}</span>
              <span className="text-label-sm text-on-surface-variant">{stat.label}</span>
              {isAnomaly && stat.label !== "Steps" && <span className="ml-auto text-xs text-tertiary-container">⚠</span>}
            </div>
            <p className={`font-display font-bold text-xl ${isAnomaly && stat.label !== "Steps" ? "text-tertiary-container" : stat.normal ? "text-secondary" : "text-warning"}`}>
              {stat.value}
            </p>
            <p className="text-xs text-on-surface-variant/60 mt-1">Normal: {stat.range}</p>
          </motion.div>
        ))}
      </div>

      {/* Anomaly alert */}
      {isAnomaly && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="p-4 bg-tertiary-container/15 border border-tertiary-container/30 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">⚠️</span>
            <h3 className="font-semibold text-tertiary-container">Unusual Reading Detected</h3>
          </div>
          <p className="text-sm text-on-surface-variant">
            This reading is unusual compared with your recent personal pattern. This is a safety indicator — not a medical diagnosis.
          </p>
        </motion.div>
      )}

      {/* Simulate controls */}
      {isDemoMode && (
        <div className="dashboard-card rounded-xl p-4 border border-primary/20">
          <p className="text-label-md text-on-surface-variant mb-3">🎬 Demo: Simulate Readings</p>
          <SimulatedReading />
        </div>
      )}

      {/* Heart rate chart */}
      <div className="dashboard-card rounded-xl p-5">
        <h3 className="font-display font-semibold text-sm mb-4">Heart Rate Trend</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#c7c4d7" }} interval="preserveStartEnd" />
              <YAxis domain={[40, 160]} tick={{ fontSize: 10, fill: "#c7c4d7" }} />
              <Tooltip content={<CustomTooltip />} />
              {baseline?.avg_hr && (
                <ReferenceLine y={baseline.avg_hr} stroke="rgba(79,219,200,0.4)" strokeDasharray="4 4" label={{ value: "Baseline", fill: "#4fdbc8", fontSize: 10 }} />
              )}
              <Line type="monotone" dataKey="hr" stroke="#c0c1ff" strokeWidth={2} dot={false} name="Heart Rate" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[180px] flex items-center justify-center text-on-surface-variant/50 text-sm">
            No data yet. Seed demo data or add readings.
          </div>
        )}
      </div>

      {/* Blood oxygen chart */}
      <div className="dashboard-card rounded-xl p-5">
        <h3 className="font-display font-semibold text-sm mb-4">Blood Oxygen (SpO₂)</h3>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#c7c4d7" }} interval="preserveStartEnd" />
            <YAxis domain={[88, 100]} tick={{ fontSize: 10, fill: "#c7c4d7" }} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={95} stroke="rgba(245,158,11,0.4)" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="spo2" stroke="#4fdbc8" strokeWidth={2} dot={false} name="SpO₂" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Anomaly history */}
      {anomalies.length > 0 && (
        <div className="dashboard-card rounded-xl p-5">
          <h3 className="font-display font-semibold text-sm mb-3">Recent Anomalies</h3>
          <div className="space-y-2">
            {anomalies.map((a, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-surface-container rounded-lg text-sm">
                <span>⚠️</span>
                <div>
                  <p className="text-on-surface">HR: {a.heart_rate?.toFixed(0)} · BP: {a.systolic_bp?.toFixed(0)} · SpO₂: {a.blood_oxygen?.toFixed(0)}%</p>
                  <p className="text-xs text-on-surface-variant">{a.timestamp ? new Date(a.timestamp).toLocaleString() : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-on-surface-variant/40 text-center pb-2">
        Health data is compared against your personal baseline pattern — not fixed population thresholds.
        This is not medical advice.
      </p>
    </div>
  );
}
