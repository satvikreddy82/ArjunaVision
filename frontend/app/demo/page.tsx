"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { simulationAPI, emergencyAPI } from "@/lib/api";
import { useStore } from "@/lib/store";
import Link from "next/link";

const SCENARIOS = [
  { id: "manual_sos", name: "Scenario 1", title: "Manual SOS", desc: "SOS button → GPS → Alert → Dashboard", icon: "🆘", color: "border-tertiary-container/40 bg-tertiary-container/5" },
  { id: "voice_sos", name: "Scenario 2", title: "Voice Emergency", desc: "Voice command → Detection → SOS", icon: "🎙️", color: "border-primary/30 bg-primary/5" },
  { id: "fall_detection", name: "Scenario 3", title: "Fall Detection", desc: "Fall → Check user → No response → Emergency", icon: "📡", color: "border-warning/30 bg-warning/5" },
  { id: "health_anomaly", name: "Scenario 4", title: "Health Anomaly", desc: "Abnormal pattern → AI analysis → Risk increase → Alert", icon: "❤️", color: "border-tertiary/30 bg-tertiary/5" },
  { id: "gps_unavailable", name: "Scenario 5", title: "GPS Unavailable", desc: "Emergency → GPS unavailable → Last known → Alert", icon: "🗺️", color: "border-sky-500/30 bg-sky-500/5" },
  { id: "route_deviation", name: "Scenario 6", title: "Route Deviation", desc: "Route deviation → Warning → No response → Escalation", icon: "⚠️", color: "border-amber-500/30 bg-amber-500/5" },
];

const PIPELINE_STAGES = ["DETECT", "ANALYZE", "LOCATE", "ALERT", "ASSIST"];

export default function DemoPage() {
  const { setDemoMode, isDemoMode, setActiveEmergency, setCurrentRisk, addNotification } = useStore();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [currentStage, setCurrentStage] = useState(-1);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState("");

  const runScenario = useCallback(async (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    setRunning(true);
    setResult(null);
    setError("");
    setCurrentStage(0);
    setCurrentStep(-1);
    setSteps([]);

    try {
      // Animate through DETECT → ANALYZE → LOCATE → ALERT → ASSIST
      for (let i = 0; i < PIPELINE_STAGES.length; i++) {
        setCurrentStage(i);
        await new Promise((res) => setTimeout(res, 700));
      }

      const res = await simulationAPI.run(scenarioId, 12.9716, 77.5946);
      const data = res.data;
      setResult(data);

      // Show scenario steps
      const scenarioSteps = (data.steps as string[]) || [];
      setSteps(scenarioSteps);
      for (let i = 0; i < scenarioSteps.length; i++) {
        setCurrentStep(i);
        await new Promise((res) => setTimeout(res, 600));
      }

      // Update global state
      setCurrentRisk({
        risk_score: data.risk_score as number,
        risk_level: data.risk_level as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        reasons: (data.reasons as string[]) || [],
        recommended_action: (data.recommended_action as string) || "",
      });

      setActiveEmergency({
        event_id: data.event_id as string,
        trigger: data.scenario_name as string,
        status: "ACTIVE",
        risk_score: data.risk_score as number,
        risk_level: data.risk_level as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        reasons: (data.reasons as string[]) || [],
        latitude: data.latitude as number || null,
        longitude: data.longitude as number || null,
        last_known_latitude: data.last_known_latitude as number,
        last_known_longitude: data.last_known_longitude as number,
        gps_available: data.gps_available as boolean,
        active: true,
        started_at: new Date().toISOString(),
      });

      addNotification({
        id: `sim-${Date.now()}`,
        title: `🎬 Demo: ${data.scenario_name}`,
        body: `Risk: ${data.risk_score}/100 — ${data.risk_level}`,
        type: "EMERGENCY",
        is_read: false,
        created_at: new Date().toISOString(),
      });

    } catch (err) {
      console.error(err);
      setError("Simulation failed. Make sure the backend is running.");
    } finally {
      setRunning(false);
    }
  }, [setCurrentRisk, setActiveEmergency, addNotification]);

  const cancelEmergency = async () => {
    const store = useStore.getState();
    if (store.activeEmergency?.event_id) {
      try { await emergencyAPI.cancel(store.activeEmergency.event_id as string, "Demo cancelled"); } catch { /* ignore */ }
    }
    store.setActiveEmergency(null);
    setResult(null);
    setCurrentStage(-1);
  };

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Header */}
      <div className="bg-surface-container-low border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-on-surface-variant hover:text-on-surface text-sm">← Dashboard</Link>
          <span className="text-white/20">|</span>
          <span className="font-display font-bold text-lg">🎬 ArjunaVision Demo</span>
          <span className="badge-warning text-xs">SIMULATION</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setDemoMode(!isDemoMode)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${isDemoMode ? "border-warning/40 text-warning bg-warning/10" : "border-white/10 text-on-surface-variant"}`}>
            {isDemoMode ? "🎬 Demo Active" : "Enable Demo Mode"}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Intro */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center py-4">
          <h1 className="font-display font-bold text-4xl mb-3">Hackathon Demo</h1>
          <p className="text-on-surface-variant text-body-lg max-w-2xl mx-auto">
            Run any of the 6 demo scenarios to see the full ArjunaVision emergency pipeline in action.
            All data is simulated — clearly labelled as DEMO.
          </p>
        </motion.div>

        {/* Pipeline animation */}
        <div className="glass-card rounded-2xl p-6">
          <p className="section-label mb-4 text-center">EMERGENCY PIPELINE</p>
          <div className="flex items-center justify-center flex-wrap gap-2">
            {PIPELINE_STAGES.map((stage, i) => (
              <div key={stage} className="flex items-center">
                <motion.div
                  animate={{
                    backgroundColor: currentStage > i ? "rgba(79,219,200,0.2)" : currentStage === i ? "rgba(192,193,255,0.2)" : "rgba(79,219,200,0.0)",
                    borderColor: currentStage > i ? "rgba(79,219,200,0.5)" : currentStage === i ? "rgba(192,193,255,0.5)" : "rgba(255,255,255,0.08)",
                    scale: currentStage === i ? 1.05 : 1,
                  }}
                  className="px-5 py-3 rounded-xl border text-center min-w-[100px]"
                >
                  <p className={`font-display font-bold text-sm ${currentStage > i ? "text-secondary" : currentStage === i ? "text-primary" : "text-on-surface-variant/40"}`}>
                    {currentStage === i && running ? (
                      <span className="flex items-center justify-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                        {stage}
                      </span>
                    ) : stage}
                  </p>
                </motion.div>
                {i < PIPELINE_STAGES.length - 1 && (
                  <span className={`mx-1 text-lg ${currentStage > i ? "text-secondary" : "text-on-surface-variant/20"}`}>→</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Scenario grid */}
        <div>
          <h2 className="font-display font-bold text-xl mb-4">Choose a Scenario</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SCENARIOS.map((scenario) => (
              <motion.button
                key={scenario.id}
                onClick={() => !running && runScenario(scenario.id)}
                disabled={running}
                whileHover={{ scale: running ? 1 : 1.02 }}
                whileTap={{ scale: running ? 1 : 0.98 }}
                className={`text-left p-6 rounded-2xl border transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                  ${selectedScenario === scenario.id && running ? "ring-2 ring-primary" : ""}
                  ${scenario.color} hover:border-opacity-60`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">{scenario.icon}</span>
                  <div>
                    <p className="text-xs text-on-surface-variant">{scenario.name}</p>
                    <p className="font-display font-bold text-base">{scenario.title}</p>
                  </div>
                  {selectedScenario === scenario.id && running && (
                    <span className="ml-auto w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  )}
                </div>
                <p className="text-sm text-on-surface-variant">{scenario.desc}</p>
                <div className="mt-3 text-xs text-primary font-semibold">
                  {running && selectedScenario === scenario.id ? "Running…" : "→ Run Scenario"}
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-tertiary-container/20 border border-tertiary-container/30 rounded-xl">
            <p className="text-sm text-tertiary-container">⚠ {error}</p>
            <p className="text-xs text-on-surface-variant mt-1">Make sure the backend is running on port 8000, or use the frontend-only demo mode.</p>
          </div>
        )}

        {/* Steps animation */}
        {steps.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-6">
            <h3 className="font-display font-bold text-lg mb-4">Scenario Steps</h3>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: currentStep >= i ? 1 : 0.2, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                    currentStep === i ? "bg-primary/15 border border-primary/30" :
                    currentStep > i ? "bg-secondary/10" : "bg-surface-container"
                  }`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    currentStep > i ? "bg-secondary text-background" :
                    currentStep === i ? "bg-primary text-on-primary animate-pulse" :
                    "bg-surface-container-high text-on-surface-variant"
                  }`}>{currentStep > i ? "✓" : i + 1}</span>
                  <span className={`text-sm ${currentStep === i ? "text-primary font-semibold" : currentStep > i ? "text-secondary" : "text-on-surface-variant"}`}>
                    {step}
                  </span>
                  {currentStep === i && running && <span className="ml-auto w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Result panel */}
        <AnimatePresence>
          {result && !running && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="glass-card rounded-2xl p-6 border border-tertiary-container/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🚨</span>
                  <h3 className="font-display font-bold text-lg text-tertiary-container">Emergency Activated</h3>
                  <span className="badge-danger">DEMO SIMULATION</span>
                </div>
                <button onClick={cancelEmergency} className="btn-secondary text-sm py-1.5 px-4">✅ Cancel Emergency</button>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="p-4 bg-surface-container rounded-xl">
                  <p className="text-xs text-on-surface-variant mb-1">Risk Score</p>
                  <p className="font-display font-bold text-3xl" style={{ color: result.risk_level === "CRITICAL" ? "#ff5168" : "#F59E0B" }}>
                    {result.risk_score as number}/100
                  </p>
                  <p className="text-sm font-semibold text-tertiary-container">{result.risk_level as string}</p>
                </div>
                <div className="p-4 bg-surface-container rounded-xl">
                  <p className="text-xs text-on-surface-variant mb-1">Location</p>
                  {result.gps_available ? (
                    <div>
                      <p className="badge-safe text-xs mb-1 inline-flex">📍 GPS AVAILABLE</p>
                      <p className="font-mono text-sm text-secondary">{(result.latitude as number)?.toFixed(4)}, {(result.longitude as number)?.toFixed(4)}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="badge-warning text-xs mb-1 inline-flex">⚠ LAST KNOWN LOCATION</p>
                      <p className="font-mono text-sm text-warning">{(result.last_known_latitude as number)?.toFixed(4)}, {(result.last_known_longitude as number)?.toFixed(4)}</p>
                      <p className="text-xs text-on-surface-variant mt-1">Current GPS unavailable</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl mb-4">
                <p className="text-xs font-semibold text-primary mb-2">🧠 AI Explanation — Why this risk level?</p>
                {((result.reasons as string[]) || []).map((r: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 py-1 text-sm text-on-surface-variant">
                    <span className="text-primary mt-0.5">→</span><span>{r}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-on-surface-variant/50">
                Recommended: {result.recommended_action as string}
              </p>

              <div className="mt-4 flex gap-3">
                <Link href="/dashboard/emergency" className="btn-danger text-sm py-2 px-4">View Emergency Page →</Link>
                <Link href="/guardian" className="btn-ghost text-sm py-2 px-4">Guardian Dashboard →</Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Demo flow guide */}
        <div className="dashboard-card rounded-xl p-6">
          <h3 className="font-display font-bold text-base mb-3">📋 Suggested Demo Flow for Judges (2–3 min)</h3>
          <div className="space-y-2 text-sm text-on-surface-variant">
            {[
              "Step 1 — Show normal dashboard (SAFE status, risk score 8/100)",
              "Step 2 — Open Demo page → Run Scenario 3 (Fall Detection)",
              "Step 3 — Watch pipeline animation: DETECT → ANALYZE → LOCATE → ALERT → ASSIST",
              "Step 4 — Result shows HIGH RISK / CRITICAL + AI explanation reasons",
              "Step 5 — Note: GPS Unavailable in Scenario 5 → Last Known Location shown",
              "Step 6 — Open Guardian Dashboard → shows emergency notification",
              "Step 7 — Read AI explanation: 'Risk increased because...'",
              "Step 8 — Cancel emergency → return to SAFE state",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-primary font-semibold shrink-0">{i + 1}.</span>
                <span>{step.slice(step.indexOf("—") + 2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
