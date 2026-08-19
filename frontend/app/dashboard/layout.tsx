"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useStore } from "../../lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { emergencyAPI } from "../../lib/api";

const NAV_ITEMS = [
  { href: "/dashboard", icon: "🏠", label: "Dashboard" },
  { href: "/dashboard/emergency", icon: "🆘", label: "Safety & SOS", emergency: true },
  { href: "/dashboard/health", icon: "❤️", label: "Health" },
  { href: "/dashboard/location", icon: "📍", label: "Location" },
  { href: "/dashboard/contacts", icon: "👥", label: "Contacts" },
  { href: "/dashboard/ai-insights", icon: "🧠", label: "AI Insights" },
  { href: "/dashboard/history", icon: "📋", label: "History" },
  { href: "/dashboard/privacy", icon: "🔒", label: "Privacy" },
  { href: "/dashboard/settings", icon: "⚙️", label: "Settings" },
];

const GUARDIAN_ITEMS = [
  { href: "/guardian", icon: "👁️", label: "Guardian Dashboard" },
  { href: "/admin", icon: "🖥️", label: "Admin Panel" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    isAuthenticated,
    user,
    activeEmergency,
    currentRisk,
    isDemoMode,
    setDemoMode,
    unreadCount,
    clearAuth,
    currentLocation,
    setActiveEmergency,
    addNotification,
    voiceActive,
    voiceText,
    setVoiceActive,
    setVoiceText,
  } = useStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const triggeringRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) router.push("/auth/login");
  }, [isAuthenticated, router]);

  // Global background Voice SOS
  useEffect(() => {
    if (!isAuthenticated || activeEmergency) {
      return;
    }

    // @ts-expect-error - Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    const emergencyPhrases = ["help me", "emergency", "i need help", "call for help", "sos", "help"];

    recognition.onresult = async (event: any) => {
      const text = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(" ")
        .toLowerCase();
      setVoiceText(text);

      if (emergencyPhrases.some((phrase) => text.includes(phrase))) {
        if (triggeringRef.current) return;
        triggeringRef.current = true;

        recognition.stop();
        setVoiceActive(false);
        
        try {
          const res = await emergencyAPI.trigger({
            trigger: "VOICE_SOS",
            latitude: currentLocation?.latitude,
            longitude: currentLocation?.longitude,
            gps_available: !!currentLocation,
          });
          setActiveEmergency({ ...res.data, active: true });
          addNotification({
            id: Date.now().toString(),
            title: "🚨 Emergency Activated",
            body: `VOICE SOS — Risk: ${res.data.risk_score}/100`,
            type: "EMERGENCY",
            is_read: false,
            created_at: new Date().toISOString(),
          });
        } catch (err) {
          console.error(err);
          // Offline fallback
          setActiveEmergency({
            event_id: "offline-" + Date.now(),
            trigger: "VOICE_SOS",
            status: "ACTIVE",
            active: true,
            risk_score: 95,
            risk_level: "CRITICAL",
            reasons: ["VOICE SOS", "Offline emergency — sync pending"],
            gps_available: !!currentLocation,
            latitude: currentLocation?.latitude,
            longitude: currentLocation?.longitude,
            started_at: new Date().toISOString(),
          } as any);
        } finally {
          triggeringRef.current = false;
        }
      }
    };

    recognition.onstart = () => {
      setVoiceActive(true);
    };

    recognition.onend = () => {
      if (isAuthenticated && !activeEmergency) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch (e) {
            console.error("Failed to restart speech recognition", e);
          }
        }, 1000);
      } else {
        setVoiceActive(false);
      }
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Failed to start speech recognition", e);
    }

    return () => {
      recognition.onend = null;
      try {
        recognition.stop();
      } catch (e) {}
      setVoiceActive(false);
    };
  }, [
    isAuthenticated,
    activeEmergency,
    currentLocation,
    setActiveEmergency,
    setVoiceActive,
    setVoiceText,
    addNotification,
  ]);

  if (!isAuthenticated) return null;

  const statusColor =
    activeEmergency ? "text-tertiary-container" :
    currentRisk.risk_level === "HIGH" || currentRisk.risk_level === "CRITICAL" ? "text-warning" :
    "text-secondary";

  const statusText =
    activeEmergency ? "EMERGENCY" :
    currentRisk.risk_level === "CRITICAL" ? "CRITICAL" :
    currentRisk.risk_level === "HIGH" ? "HIGH RISK" :
    currentRisk.risk_level === "MEDIUM" ? "MONITORING" : "SAFE";

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* ── Sidebar (desktop) ─────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 bg-surface-container-low border-r border-white/5 shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <div>
              <div className="font-display font-bold text-primary text-base">ArjunaVision</div>
              <div className="text-xs text-on-surface-variant/60 italic">Detect. Protect. Connect.</div>
            </div>
          </Link>
        </div>

        {/* Status pill */}
        <div className="px-4 py-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            activeEmergency ? "bg-tertiary-container/15 border border-tertiary-container/30" : "bg-surface-container"
          }`}>
            <span className={`w-2 h-2 rounded-full ${activeEmergency ? "bg-tertiary-container animate-ping" : "bg-secondary animate-pulse"}`} />
            <span className={`text-label-sm font-semibold ${statusColor}`}>{statusText}</span>
            <span className="text-xs text-on-surface-variant ml-auto">{currentRisk.risk_score}/100</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto no-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  item.emergency
                    ? isActive
                      ? "bg-tertiary-container/20 text-tertiary-container font-semibold"
                      : "text-tertiary-container/80 hover:bg-tertiary-container/10"
                    : isActive
                    ? "bg-primary/15 text-primary font-semibold"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.emergency && activeEmergency && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-tertiary-container animate-ping" />
                )}
              </Link>
            );
          })}

          <div className="pt-4 pb-2">
            <p className="section-label px-3 mb-2" style={{ fontSize: "10px" }}>OTHER VIEWS</p>
          </div>
          {GUARDIAN_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive ? "bg-surface-container-high text-on-surface font-semibold" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                }`}>
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom: user + demo toggle */}
        <div className="p-4 border-t border-white/5 space-y-3">
          {isDemoMode && (
            <div className="px-3 py-2 bg-warning/10 border border-warning/20 rounded-lg text-xs text-warning text-center">
              🎬 DEMO MODE ACTIVE
            </div>
          )}
          <button
            onClick={() => setDemoMode(!isDemoMode)}
            className="w-full text-xs text-on-surface-variant hover:text-on-surface py-2 px-3 rounded-lg hover:bg-surface-container transition-colors"
          >
            {isDemoMode ? "🔴 Exit Demo Mode" : "🎬 Enter Demo Mode"}
          </button>
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-container">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
              {user?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-on-surface truncate">{user?.name}</p>
              <p className="text-xs text-on-surface-variant truncate">{user?.email}</p>
            </div>
            <button onClick={() => clearAuth()} className="text-on-surface-variant/50 hover:text-on-surface-variant text-xs">✕</button>
          </div>
        </div>
      </aside>

      {/* ── Mobile sidebar overlay ──────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setSidebarOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              className="lg:hidden fixed left-0 top-0 h-full w-64 bg-surface-container-low border-r border-white/5 z-50 flex flex-col">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <span className="font-display font-bold text-primary">🛡️ ArjunaVision</span>
                <button onClick={() => setSidebarOpen(false)} className="text-on-surface-variant">✕</button>
              </div>
              <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      pathname === item.href ? "bg-primary/15 text-primary font-semibold" : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                    }`}>
                    <span>{item.icon}</span><span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content area ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-surface-container-low/80 backdrop-blur-xl border-b border-white/5 px-4 lg:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-on-surface-variant" onClick={() => setSidebarOpen(true)}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="font-display font-bold text-base text-on-surface">
                {NAV_ITEMS.find((n) => n.href === pathname)?.label || "Dashboard"}
              </h1>
              <p className="text-xs text-on-surface-variant/60">ArjunaVision Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Link href="/dashboard/history" className="relative p-2 rounded-lg hover:bg-surface-container transition-colors">
              <span className="text-lg">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-tertiary-container rounded-full text-[10px] text-white flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            {/* SOS quick button */}
            <Link href="/dashboard/emergency"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-emergency text-white text-xs font-bold rounded-full shadow-emergency hover:opacity-90 transition-opacity">
              🆘 SOS
            </Link>
          </div>
        </header>

        {/* Active emergency banner */}
        {activeEmergency && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }}
            className="bg-gradient-emergency px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <span className="animate-ping w-2 h-2 rounded-full bg-white inline-block" />
              <span className="font-bold text-sm">🚨 EMERGENCY ACTIVE — Risk: {currentRisk.risk_score}/100</span>
            </div>
            <Link href="/dashboard/emergency" className="text-white/80 hover:text-white text-xs underline">View →</Link>
          </motion.div>
        )}

        {/* Demo mode banner */}
        {isDemoMode && (
          <div className="bg-warning/10 border-b border-warning/20 px-4 py-2 text-center text-xs text-warning">
            🎬 DEMO MODE — All data is simulated for demonstration purposes
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {children}
          </motion.div>
        </main>

        {/* Bottom nav (mobile) */}
        <nav className="lg:hidden bg-surface-container-low border-t border-white/5 px-2 py-2 flex items-center justify-around shrink-0">
          {NAV_ITEMS.slice(0, 5).map((item) => (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${
                pathname === item.href ? "text-primary" : "text-on-surface-variant"
              }`}>
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label.split(" ")[0]}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
