"use client";
import { useState, Suspense } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { authAPI } from "../../../lib/api";
import { useStore } from "../../../lib/store";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "true";
  const { setAuth } = useStore();

  const [name, setName] = useState(isDemo ? "Demo User" : "");
  const [email, setEmail] = useState(isDemo ? "demo@arjunavision.com" : "");
  const [password, setPassword] = useState(isDemo ? "demo1234" : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await authAPI.register(email, password, name);
      const { access_token, user_id, role } = res.data;
      setAuth(access_token, { id: user_id, email, name, role });
      router.push("/dashboard");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr?.response?.data?.detail || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-3xl">🛡️</span>
            <span className="font-display font-bold text-2xl text-primary">ArjunaVision</span>
          </Link>
          <p className="text-on-surface-variant mt-2 text-sm">
            {isDemo ? "Create demo account to explore all features" : "Create your safety account"}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8 border border-white/8">
          {isDemo && (
            <div className="mb-6 p-4 bg-secondary/10 border border-secondary/20 rounded-xl">
              <p className="text-xs text-secondary font-semibold mb-1">✓ Demo Mode Active</p>
              <p className="text-xs text-on-surface-variant">Pre-filled with demo credentials. Click create to continue.</p>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-label-md text-on-surface-variant mb-2">Full Name</label>
              <input type="text" required className="input-field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya Sharma" />
            </div>
            <div>
              <label className="block text-label-md text-on-surface-variant mb-2">Email address</label>
              <input type="email" required className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-label-md text-on-surface-variant mb-2">Password</label>
              <input type="password" required minLength={6} className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" />
            </div>

            {error && (
              <div className="p-3 bg-tertiary-container/20 border border-tertiary-container/30 rounded-lg text-sm text-tertiary">⚠ {error}</div>
            )}

            <div className="text-xs text-on-surface-variant p-3 bg-surface-container rounded-lg">
              🔒 By creating an account you consent to location and health monitoring for safety purposes only.
              You control all data sharing in Privacy Settings.
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 disabled:opacity-50">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account…
                </span>
              ) : "Create Account →"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center text-sm text-on-surface-variant">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary hover:underline font-semibold">Sign in</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
