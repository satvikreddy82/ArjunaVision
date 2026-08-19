"use client";
import { useStore } from "../../../lib/store";
import Link from "next/link";
import { motion } from "framer-motion";

export default function SettingsPage() {
  const { user, clearAuth } = useStore();
  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="font-display font-bold text-2xl">Settings</h1>
        <p className="text-on-surface-variant text-sm">Account and application preferences</p>
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-card rounded-xl p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary font-display font-bold text-2xl">
            {user?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className="font-display font-bold text-lg">{user?.name}</p>
            <p className="text-on-surface-variant text-sm">{user?.email}</p>
            <p className="text-xs text-primary mt-1 capitalize">{user?.role?.toLowerCase()} account</p>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { href: "/dashboard/privacy", label: "🔒 Privacy Settings", desc: "Control data sharing and retention" },
            { href: "/dashboard/contacts", label: "👥 Emergency Contacts", desc: "Manage trusted contacts" },
            { href: "/demo", label: "🎬 Run Demo Scenarios", desc: "Test all emergency scenarios" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-4 p-4 rounded-xl bg-surface-container hover:bg-surface-container-high transition-colors">
              <div>
                <p className="font-semibold text-sm">{item.label}</p>
                <p className="text-xs text-on-surface-variant">{item.desc}</p>
              </div>
              <span className="ml-auto text-on-surface-variant">→</span>
            </Link>
          ))}
          <button onClick={() => clearAuth()} className="w-full flex items-center gap-4 p-4 rounded-xl bg-tertiary-container/10 hover:bg-tertiary-container/20 transition-colors">
            <div className="text-left">
              <p className="font-semibold text-sm text-tertiary-container">Sign Out</p>
              <p className="text-xs text-on-surface-variant">Return to landing page</p>
            </div>
          </button>
        </div>
      </motion.div>
      <p className="text-xs text-on-surface-variant/40 text-center">ArjunaVision v1.0.0 · Hackathon Demo Build</p>
    </div>
  );
}
