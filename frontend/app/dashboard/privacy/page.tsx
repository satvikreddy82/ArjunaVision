"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { privacyAPI } from "@/lib/api";

interface PrivacySettings {
  share_location: boolean;
  share_health: boolean;
  guardian_access: boolean;
  share_emergency_info: boolean;
  location_retention_days: number;
  health_retention_days: number;
  voice_processing: boolean;
  push_notifications: boolean;
}

const DEFAULT_PRIVACY: PrivacySettings = {
  share_location: true, share_health: false, guardian_access: true,
  share_emergency_info: true, location_retention_days: 30, health_retention_days: 90,
  voice_processing: true, push_notifications: true,
};

function Toggle({ value, onChange, label, desc, icon, warning }: { value: boolean; onChange: (v: boolean) => void; label: string; desc: string; icon: string; warning?: boolean }) {
  return (
    <div className="flex items-start gap-4 p-4 bg-surface-container rounded-xl">
      <span className="text-2xl mt-0.5">{icon}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between gap-4">
          <p className="font-semibold text-sm">{label}</p>
          <button onClick={() => onChange(!value)}
            className={`flex items-center w-11 h-6 p-0.5 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary/30 shrink-0 cursor-pointer ${
              value ? "bg-primary justify-end" : "bg-surface-container-high justify-start"
            }`}>
            <motion.span layout className="w-5 h-5 bg-white rounded-full shadow" />
          </button>
        </div>
        <p className="text-xs text-on-surface-variant mt-1">{desc}</p>
        {warning && value && <p className="text-xs text-warning mt-1">⚠ Sharing enabled — {warning}</p>}
      </div>
    </div>
  );
}

export default function PrivacyPage() {
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_PRIVACY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    privacyAPI.get().then((res) => setSettings({ ...DEFAULT_PRIVACY, ...res.data })).catch(() => {});
  }, []);

  const update = (key: keyof PrivacySettings, value: boolean | number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      await privacyAPI.update(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* offline */ } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl">Privacy Center</h1>
        <p className="text-on-surface-variant text-sm">Privacy by default — you control everything</p>
      </div>

      <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-xl">
        <p className="text-xs text-secondary font-semibold mb-1">🔒 Privacy Principles</p>
        <p className="text-xs text-on-surface-variant">
          ArjunaVision collects only what's needed for your safety. No data is shared publicly.
          You control every permission and can revoke access at any time.
        </p>
      </div>

      {/* Sharing settings */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
        <p className="section-label">DATA SHARING</p>
        <Toggle value={settings.share_location} onChange={(v) => update("share_location", v)} icon="📍" label="Location Sharing" desc="Allow guardians to see your current and last-known location." warning="guardians can track your location" />
        <Toggle value={settings.share_health} onChange={(v) => update("share_health", v)} icon="❤️" label="Health Data Sharing" desc="Share health readings with authorized guardians during emergencies." warning="health data visible to guardians in emergencies" />
        <Toggle value={settings.guardian_access} onChange={(v) => update("guardian_access", v)} icon="👁️" label="Guardian Dashboard Access" desc="Allow added guardians to view your safety dashboard." />
        <Toggle value={settings.share_emergency_info} onChange={(v) => update("share_emergency_info", v)} icon="🆘" label="Emergency Information Card" desc="Share blood group, allergies, and contacts during active emergencies." />
      </motion.div>

      {/* System settings */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }} className="space-y-3">
        <p className="section-label">SYSTEM</p>
        <Toggle value={settings.voice_processing} onChange={(v) => update("voice_processing", v)} icon="🎙️" label="Voice Processing" desc="Enable voice SOS detection. Audio is processed locally — never uploaded." />
        <Toggle value={settings.push_notifications} onChange={(v) => update("push_notifications", v)} icon="🔔" label="Push Notifications" desc="Receive safety alerts and emergency notifications on this device." />
      </motion.div>

      {/* Retention settings */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.2 } }} className="dashboard-card rounded-xl p-5 space-y-4">
        <p className="section-label">DATA RETENTION</p>
        <div>
          <label className="block text-sm font-semibold mb-2">Location History: <span className="text-primary">{settings.location_retention_days} days</span></label>
          <input type="range" min={7} max={365} value={settings.location_retention_days} onChange={(e) => update("location_retention_days", Number(e.target.value))}
            className="w-full accent-primary" />
          <div className="flex justify-between text-xs text-on-surface-variant mt-1"><span>7 days</span><span>365 days</span></div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Health Data: <span className="text-primary">{settings.health_retention_days} days</span></label>
          <input type="range" min={7} max={365} value={settings.health_retention_days} onChange={(e) => update("health_retention_days", Number(e.target.value))}
            className="w-full accent-primary" />
          <div className="flex justify-between text-xs text-on-surface-variant mt-1"><span>7 days</span><span>365 days</span></div>
        </div>
      </motion.div>

      <button onClick={save} disabled={saving}
        className={`btn-primary w-full py-3 disabled:opacity-60 ${saved ? "bg-gradient-secondary" : ""}`}>
        {saving ? "Saving…" : saved ? "✓ Settings Saved" : "Save Privacy Settings"}
      </button>

      <p className="text-xs text-on-surface-variant/40 text-center">
        Privacy settings are applied immediately. Contact data is never publicly accessible.
      </p>
    </div>
  );
}
