"use client";
import { motion } from "framer-motion";
import Link from "next/link";

const features = [
  {
    icon: "🆘",
    gradient: "from-red-500/20 to-rose-600/10",
    border: "border-red-500/20",
    title: "Smart SOS System",
    desc: "One-touch emergency with GPS, last-known location fallback, and automatic contact notifications.",
  },
  {
    icon: "🎙️",
    gradient: "from-violet-500/20 to-indigo-600/10",
    border: "border-violet-500/20",
    title: "Voice SOS",
    desc: "Hands-free emergency activation. Say your custom phrase and ArjunaVision springs into action.",
  },
  {
    icon: "📡",
    gradient: "from-sky-500/20 to-blue-600/10",
    border: "border-sky-500/20",
    title: "Fall Detection",
    desc: "Real-time motion analysis detects falls and automatically initiates safety checks.",
  },
  {
    icon: "🧠",
    gradient: "from-teal-500/20 to-emerald-600/10",
    border: "border-teal-500/20",
    title: "AI Risk Engine",
    desc: "Explainable AI combines multiple signals to compute a real-time risk score with clear reasons.",
  },
  {
    icon: "❤️",
    gradient: "from-pink-500/20 to-rose-600/10",
    border: "border-pink-500/20",
    title: "Health Monitoring",
    desc: "Personal baseline learning detects unusual readings compared to your unique health pattern.",
  },
  {
    icon: "📍",
    gradient: "from-amber-500/20 to-yellow-600/10",
    border: "border-amber-500/20",
    title: "Location Trail",
    desc: "GPS tracking with last-known location fallback. Your safety network always knows where you are.",
  },
  {
    icon: "👨‍👩‍👧",
    gradient: "from-indigo-500/20 to-violet-600/10",
    border: "border-indigo-500/20",
    title: "Guardian Dashboard",
    desc: "Family members get real-time safety alerts, location, and emergency notifications.",
  },
  {
    icon: "🔒",
    gradient: "from-slate-500/20 to-gray-600/10",
    border: "border-slate-500/20",
    title: "Privacy First",
    desc: "Full control over what data is shared, with whom, and for how long. Privacy is the default.",
  },
];

const steps = [
  { step: "01", title: "MONITOR", desc: "Continuous health, motion & location signals", color: "text-secondary" },
  { step: "02", title: "DETECT", desc: "AI engine detects anomalies in real-time", color: "text-primary" },
  { step: "03", title: "VERIFY", desc: "Safety check sent to user before escalating", color: "text-warning" },
  { step: "04", title: "ASSESS", desc: "Multi-signal risk score calculated", color: "text-warning" },
  { step: "05", title: "LOCATE", desc: "GPS + last-known location retrieved", color: "text-tertiary-container" },
  { step: "06", title: "ALERT", desc: "Emergency contacts and services notified", color: "text-tertiary-container" },
  { step: "07", title: "ASSIST", desc: "Nearby facilities shown, guidance provided", color: "text-secondary" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface overflow-x-hidden">
      {/* ── Nav ───────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <span className="font-display font-bold text-xl text-primary">ArjunaVision</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-on-surface-variant">
            <a href="#features" className="hover:text-on-surface transition-colors">Features</a>
            <a href="#pipeline" className="hover:text-on-surface transition-colors">How it Works</a>
            <a href="#demo" className="hover:text-on-surface transition-colors">Demo</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="btn-ghost text-sm py-2 px-4 hidden sm:block">
              Sign In
            </Link>
            <Link href="/auth/register" className="btn-primary text-sm py-2 px-4">
              Get Protected
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 px-6 text-center overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 badge-primary mb-8 py-1.5 px-4 text-sm"
          >
            <span className="dot-primary" />
            AI-Powered Safety Platform
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display font-bold text-5xl md:text-7xl leading-tight tracking-tight mb-6"
          >
            Your AI-Powered
            <br />
            <span className="text-gradient-primary">Safety Guardian</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-body-lg text-on-surface-variant max-w-2xl mx-auto mb-10"
          >
            Detect danger. Understand risk. Share location. Get help.
            <br />
            ArjunaVision combines smart emergency detection with explainable AI
            and real-time family coordination.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link href="/auth/register" className="btn-primary text-base py-3.5 px-8 rounded-xl">
              🛡️ Get Protected
            </Link>
            <Link href="/demo" className="btn-ghost text-base py-3.5 px-8 rounded-xl">
              🎬 View Demo
            </Link>
          </motion.div>

          {/* Disclaimer */}
          <p className="mt-6 text-label-sm text-on-surface-variant/50">
            AI insights are safety indicators, not medical diagnosis. For real emergencies, always call emergency services.
          </p>
        </div>

        {/* Animated dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="relative max-w-5xl mx-auto mt-20"
        >
          <div className="glass-card rounded-2xl p-6 border border-white/8 shadow-2xl">
            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* Status card */}
              <div className="col-span-1 bg-secondary/10 border border-secondary/20 rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">✅</div>
                <div className="font-display font-bold text-secondary text-xl">SAFE</div>
                <div className="text-label-sm text-on-surface-variant mt-1">AI Risk: 8/100</div>
              </div>
              {/* Health card */}
              <div className="col-span-1 bg-primary/10 border border-primary/20 rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">❤️</div>
                <div className="font-display font-bold text-primary text-xl">72 BPM</div>
                <div className="text-label-sm text-on-surface-variant mt-1">Normal Range</div>
              </div>
              {/* Location card */}
              <div className="col-span-1 bg-sky-500/10 border border-sky-500/20 rounded-xl p-4 text-center">
                <div className="text-3xl mb-2">📍</div>
                <div className="font-display font-bold text-sky-400 text-sm">MG Road</div>
                <div className="text-label-sm text-on-surface-variant mt-1">Live GPS</div>
              </div>
            </div>
            {/* Risk bar */}
            <div className="bg-surface-container rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-label-md text-on-surface-variant">AI RISK SCORE</span>
                <span className="text-primary font-bold">LOW RISK</span>
              </div>
              <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full w-[8%] bg-gradient-primary rounded-full" />
              </div>
            </div>
          </div>
          <div className="absolute -inset-1 bg-gradient-primary rounded-2xl blur-xl opacity-10 -z-10" />
        </motion.div>
      </section>

      {/* ── Pipeline ──────────────────────────────────────────── */}
      <section id="pipeline" className="py-24 px-6 bg-surface-container-low/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="section-label mb-3">Safety Pipeline</p>
            <h2 className="font-display font-bold text-4xl">MONITOR → DETECT → ASSIST</h2>
            <p className="text-on-surface-variant mt-4 max-w-2xl mx-auto">
              Every ArjunaVision action follows a rigorous pipeline — no black-box decisions.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {steps.map((s, i) => (
              <motion.div
                key={s.step}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center"
              >
                <div className="glass-card rounded-xl px-5 py-4 text-center min-w-[130px]">
                  <div className={`text-label-sm font-semibold mb-1 ${s.color}`}>{s.step}</div>
                  <div className={`font-display font-bold text-base ${s.color}`}>{s.title}</div>
                  <div className="text-xs text-on-surface-variant mt-1 leading-tight">{s.desc}</div>
                </div>
                {i < steps.length - 1 && (
                  <span className="text-on-surface-variant/30 mx-1 text-xl hidden md:block">→</span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="section-label mb-3">Capabilities</p>
            <h2 className="font-display font-bold text-4xl">Every protection. One platform.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className={`glass-card rounded-xl p-6 border ${f.border} hover:scale-[1.02] transition-transform duration-200`}
              >
                <div className={`text-3xl mb-4 w-12 h-12 flex items-center justify-center rounded-lg bg-gradient-to-br ${f.gradient}`}>
                  {f.icon}
                </div>
                <h3 className="font-display font-bold text-base mb-2">{f.title}</h3>
                <p className="text-body-sm text-on-surface-variant">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo CTA ──────────────────────────────────────────── */}
      <section id="demo" className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="glass-card rounded-2xl p-12 border border-primary/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 pointer-events-none" />
            <div className="relative">
              <div className="text-5xl mb-6 animate-float">🛡️</div>
              <h2 className="font-display font-bold text-4xl mb-4">
                See ArjunaVision in Action
              </h2>
              <p className="text-body-lg text-on-surface-variant mb-8">
                Run the interactive demo — simulate fall detection, voice SOS, route deviation,
                and watch the AI risk engine explain every decision in real-time.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/demo" className="btn-primary py-3.5 px-8 rounded-xl text-base">
                  🎬 Launch Demo
                </Link>
                <Link href="/auth/register" className="btn-ghost py-3.5 px-8 rounded-xl text-base">
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-6 text-center text-on-surface-variant/50 text-sm">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span>🛡️</span>
          <span className="font-display font-bold text-on-surface-variant">ArjunaVision</span>
          <span className="text-on-surface-variant/30">·</span>
          <span className="italic">Detect. Protect. Connect.</span>
        </div>
        <p>
          AI insights are application-generated safety indicators, not medical diagnosis or guaranteed emergency service contact.
          Always call 112/911 for real emergencies.
        </p>
      </footer>
    </div>
  );
}
