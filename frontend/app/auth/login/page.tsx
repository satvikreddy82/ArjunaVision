"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authAPI } from "../../../lib/api";
import { useStore } from "../../../lib/store";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useStore();
  const [email, setEmail] = useState("demo@arjunavision.com");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authAPI.login(email, password);
      const { access_token, user_id, name, role } = res.data;
      setAuth(access_token, { id: user_id, email, name, role });
      router.push("/dashboard");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string | any[] } } };
      let errorMessage = "Login failed. Please check your credentials.";
      const detail = axiosErr?.response?.data?.detail;
      if (typeof detail === "string") {
        errorMessage = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        errorMessage = detail[0].msg || "Validation error. Please check your inputs.";
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Demo quick-login
  const quickDemo = async () => {
    setEmail("demo@arjunavision.com");
    setPassword("demo1234");
    setLoading(true);
    setError("");
    try {
      const res = await authAPI.login("demo@arjunavision.com", "demo1234");
      const { access_token, user_id, name, role } = res.data;
      setAuth(access_token, { id: user_id, email: "demo@arjunavision.com", name, role });
      router.push("/dashboard");
    } catch {
      // If demo account doesn't exist, redirect to register
      router.push("/auth/register?demo=true");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="absolute inset-0 bg-gradient-hero pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-3xl">🛡️</span>
            <span className="font-display font-bold text-2xl text-primary">ArjunaVision</span>
          </Link>
          <p className="text-on-surface-variant mt-2 text-sm">Sign in to your safety dashboard</p>
        </div>

        <div className="glass-card rounded-2xl p-8 border border-white/8">
          {/* Demo banner */}
          <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-xl">
            <p className="text-xs text-on-surface-variant mb-2">🎯 <strong className="text-primary">Hackathon Demo</strong></p>
            <p className="text-xs text-on-surface-variant">Email: <code className="text-primary">demo@arjunavision.com</code></p>
            <p className="text-xs text-on-surface-variant">Password: <code className="text-primary">demo1234</code></p>
            <button
              onClick={quickDemo}
              className="mt-3 w-full py-2 px-4 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-semibold rounded-lg transition-colors"
            >
              → Quick Demo Login
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-label-md text-on-surface-variant mb-2" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="input-field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-label-md text-on-surface-variant mb-2" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-3 bg-tertiary-container/20 border border-tertiary-container/30 rounded-lg text-sm text-tertiary">
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/5 text-center text-sm text-on-surface-variant">
            Don't have an account?{" "}
            <Link href="/auth/register" className="text-primary hover:underline font-semibold">
              Create account
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
