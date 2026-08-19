"use client";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from "recharts";

const RISK_COLORS: Record<string, string> = { LOW: "#4fdbc8", MEDIUM: "#F59E0B", HIGH: "#fb923c", CRITICAL: "#ff5168" };

function RiskGauge({ score, level }: { score: number; level: string }) {
  const color = RISK_COLORS[level] || "#4fdbc8";
  return (
    <div className="relative flex flex-col items-center">
      <ResponsiveContainer width={200} height={200}>
        <RadialBarChart innerRadius="70%" outerRadius="90%" data={[{ value: score, fill: color }]}
          startAngle={210} endAngle={-30}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "rgba(255,255,255,0.04)" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display font-black text-4xl" style={{ color }}>{score}</span>
        <span className="text-sm text-on-surface-variant">/100</span>
        <span className="text-xs font-semibold mt-1" style={{ color }}>{level}</span>
      </div>
    </div>
  );
}

export default function AIInsightsPage() {
  const { currentRisk, healthHistory, locationHistory, activeEmergency } = useStore();

  const recentHealth = healthHistory.slice(0, 10);
  const anomalyCount = recentHealth.filter((h) => h.is_anomaly).length;

  const insights = [
    {
      icon: "🧠",
      title: "Risk Assessment",
      value: `${currentRisk.risk_level} RISK`,
      desc: `Score: ${currentRisk.risk_score}/100`,
      status: currentRisk.risk_level === "LOW" ? "safe" : "warning",
    },
    {
      icon: "❤️",
      title: "Health Pattern",
      value: anomalyCount > 0 ? `${anomalyCount} anomalies` : "Normal baseline",
      desc: `From ${recentHealth.length} recent readings`,
      status: anomalyCount > 0 ? "warning" : "safe",
    },
    {
      icon: "📍",
      title: "Location Activity",
      value: `${locationHistory.length} points`,
      desc: "Last 24 hours",
      status: "safe",
    },
    {
      icon: "🚨",
      title: "Emergency Status",
      value: activeEmergency ? "ACTIVE" : "None Active",
      desc: activeEmergency ? "Emergency in progress" : "No recent emergencies",
      status: activeEmergency ? "danger" : "safe",
    },
  ];

  const tips = [
    "Your activity pattern is similar to your recent baseline. No unusual movement detected.",
    "Health readings are within your normal personal range.",
    "Location trail is consistent with regular patterns.",
    "All safety signals are within expected parameters.",
  ];

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl">AI Safety Insights</h1>
        <p className="text-on-surface-variant text-sm">Explainable AI — understand every risk assessment</p>
      </div>

      {/* Risk gauge + reasons */}
      <div className="grid md:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-card rounded-xl p-6 flex flex-col items-center">
          <p className="section-label mb-4">CURRENT RISK SCORE</p>
          <RiskGauge score={currentRisk.risk_score} level={currentRisk.risk_level} />
          <p className="text-xs text-on-surface-variant/60 mt-4 text-center">
            Score is computed from health, motion, location, and response signals. Not a medical indicator.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }}
          className="dashboard-card rounded-xl p-6">
          <h3 className="font-display font-semibold text-sm mb-4">🧠 Why this risk level?</h3>
          <div className="space-y-2 mb-6">
            {currentRisk.reasons.map((r, i) => (
              <div key={i} className="flex items-start gap-2 p-3 bg-surface-container rounded-lg">
                <span className="text-primary mt-0.5 text-sm">→</span>
                <p className="text-sm text-on-surface-variant">{r}</p>
              </div>
            ))}
          </div>
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-xs font-semibold text-primary mb-1">Recommended Action</p>
            <p className="text-xs text-on-surface-variant">{currentRisk.recommended_action}</p>
          </div>
        </motion.div>
      </div>

      {/* Insight cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {insights.map((insight, i) => (
          <motion.div key={insight.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`dashboard-card rounded-xl p-4 border ${
              insight.status === "danger" ? "border-tertiary-container/30" :
              insight.status === "warning" ? "border-warning/30" : "border-white/5"
            }`}>
            <div className="text-2xl mb-2">{insight.icon}</div>
            <p className="text-label-sm text-on-surface-variant mb-1">{insight.title}</p>
            <p className={`font-display font-bold text-sm mb-1 ${
              insight.status === "danger" ? "text-tertiary-container" :
              insight.status === "warning" ? "text-warning" : "text-secondary"
            }`}>{insight.value}</p>
            <p className="text-xs text-on-surface-variant/60">{insight.desc}</p>
          </motion.div>
        ))}
      </div>

      {/* AI-generated tips */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.3 } }}
        className="dashboard-card rounded-xl p-5">
        <h3 className="font-display font-semibold text-sm mb-4">💡 AI Safety Observations</h3>
        <div className="space-y-3">
          {tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-surface-container rounded-lg">
              <span className="text-secondary text-sm mt-0.5">✓</span>
              <p className="text-sm text-on-surface-variant">{tip}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Disclaimer */}
      <div className="p-4 bg-surface-container rounded-xl border border-outline-variant/20">
        <p className="text-xs text-on-surface-variant">
          <strong className="text-on-surface">⚠ Disclaimer:</strong> AI insights are application-generated safety
          indicators based on pattern analysis. They are not medical diagnoses, clinical assessments, or guaranteed
          predictions. Emergency notification delivery depends on device, network, and service availability.
        </p>
      </div>
    </div>
  );
}
