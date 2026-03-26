"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Brain, CheckCircle, Eye, EyeOff, Lock, Mail, Sparkles, Swords, Timer, TrendingUp } from "lucide-react";
import { validatePassword } from "@/lib/validation";

type FlashType = "success" | "error";
type AuthMode = "signin" | "signup";

interface FlashState {
  type: FlashType;
  text: string;
}

function resolveMode(value: string | null): AuthMode {
  return value === "signup" ? "signup" : "signin";
}

const FEATURES = [
  { icon: <CheckCircle className="h-4 w-4 text-status-success" />, text: "Daily wellness check-ins & mood tracking" },
  { icon: <Sparkles className="h-4 w-4 text-accent-primary" />, text: "AI companion powered by your data" },
  { icon: <Swords className="h-4 w-4 text-amber-400" />, text: "Gamified quest system for your goals" },
  { icon: <TrendingUp className="h-4 w-4 text-cyan-400" />, text: "Deep analytics & burnout detection" },
  { icon: <Timer className="h-4 w-4 text-fuchsia-400" />, text: "Focus sessions with smart insights" },
];

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<FlashState | null>(null);

  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLogin = mode === "signin";

  useEffect(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    const params = new URLSearchParams(search);
    setMode(resolveMode(params.get("mode")));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    let active = true;
    void axios
      .get("/api/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then(() => { if (active) router.replace("/dashboard/insight"); })
      .catch(() => { localStorage.removeItem("token"); });
    return () => { active = false; };
  }, [router]);

  useEffect(() => {
    return () => { if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current); };
  }, []);

  const pageTitle = useMemo(() => isLogin ? "Welcome back" : "Create your account", [isLogin]);
  const pageSubtitle = useMemo(() => isLogin ? "Sign in to your Digital Twin" : "Initialize your Digital Twin", [isLogin]);

  const setAuthMode = (nextMode: AuthMode) => {
    if (redirectTimerRef.current) { clearTimeout(redirectTimerRef.current); redirectTimerRef.current = null; }
    setMode(nextMode);
    setFlash(null);
    setLoading(false);
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) { setFlash({ type: "error", text: "Please fill in all required fields." }); return; }
    if (!isLogin) {
      const pv = validatePassword(password.trim());
      if (!pv.isValid) { setFlash({ type: "error", text: pv.message }); return; }
      if (password.trim() !== confirmPassword.trim()) { setFlash({ type: "error", text: "Passwords do not match." }); return; }
    }
    if (redirectTimerRef.current) { clearTimeout(redirectTimerRef.current); redirectTimerRef.current = null; }
    setLoading(true);
    setFlash(null);
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const response = await axios.post(endpoint, { email: email.trim(), password: password.trim() });
      const token = String(response.data?.token || "").trim();
      if (!token) { setFlash({ type: "error", text: "Authentication failed. Please retry." }); return; }
      localStorage.setItem("token", token);
      if (isLogin) { router.replace("/dashboard/insight"); return; }
      setFlash({ type: "success", text: "Account created! Loading your twin..." });
      redirectTimerRef.current = setTimeout(() => { router.replace("/dashboard/insight"); }, 700);
    } catch (error) {
      const message = axios.isAxiosError(error) && error.response?.data?.msg
        ? String(error.response.data.msg)
        : isLogin ? "Invalid credentials. Please try again." : "Registration failed. Please retry.";
      setFlash({ type: "error", text: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg-base flex">
      {/* Animated Background Orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-accent-primary/8 blur-[120px] animate-float" style={{ animationDelay: "0s" }} />
        <div className="absolute top-1/2 -right-40 h-[500px] w-[500px] rounded-full bg-fuchsia-500/6 blur-[120px] animate-float" style={{ animationDelay: "2s" }} />
        <div className="absolute -bottom-20 left-1/3 h-[400px] w-[400px] rounded-full bg-indigo-500/6 blur-[100px] animate-float" style={{ animationDelay: "1s" }} />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(139,92,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Left Panel — Brand & Features (desktop only) */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col justify-between p-12 xl:p-16 relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary shadow-[0_0_20px_rgba(139,92,246,0.5)]">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Digital Twin</span>
        </div>

        {/* Main Hero */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent-primary/30 bg-accent-primary/10 px-4 py-1.5 text-xs font-semibold text-accent-glow">
              <Sparkles className="h-3.5 w-3.5" />
              AI-powered personal intelligence
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight text-white">
              Your data, understood
              <br />
              <span className="text-gradient">by your digital twin.</span>
            </h1>
            <p className="text-base xl:text-lg text-text-secondary leading-relaxed max-w-md">
              Track mood, build habits, and gain AI-driven insights about yourself — every single day.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl bg-bg-panel/60 border border-border/50 px-4 py-3 backdrop-blur-sm"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-card/80">
                  {feature.icon}
                </div>
                <span className="text-sm font-medium text-text-secondary">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Subtle bottom decoration */}
        <p className="text-xs text-text-muted">© {new Date().getFullYear()} Digital Twin. All rights reserved.</p>
      </div>

      {/* Right Panel — Auth Form */}
      <div className="flex w-full lg:w-[48%] xl:w-[45%] items-center justify-center px-6 py-10 relative z-10">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary shadow-[0_0_20px_rgba(139,92,246,0.5)]">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Digital Twin</span>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-border bg-bg-card shadow-2xl shadow-black/30 overflow-hidden">
            {/* Card Header with tabs */}
            <div className="p-6 pb-0">
              <h2 className="text-xl font-bold text-white">{pageTitle}</h2>
              <p className="mt-1 text-sm text-text-secondary">{pageSubtitle}</p>

              {/* Tab Switcher */}
              <div className="mt-5 flex rounded-xl border border-border bg-bg-panel p-1 text-sm font-semibold relative">
                <button
                  type="button"
                  className={[
                    "w-1/2 rounded-lg py-2 text-sm font-semibold transition-all duration-200 relative z-10",
                    isLogin ? "text-white" : "text-text-muted hover:text-text-secondary",
                  ].join(" ")}
                  onClick={() => setAuthMode("signin")}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={[
                    "w-1/2 rounded-lg py-2 text-sm font-semibold transition-all duration-200 relative z-10",
                    !isLogin ? "text-white" : "text-text-muted hover:text-text-secondary",
                  ].join(" ")}
                  onClick={() => setAuthMode("signup")}
                >
                  Sign Up
                </button>
                <div
                  className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-bg-card shadow-sm border border-border/60 transition-transform duration-300 ease-in-out"
                  style={{ transform: isLogin ? "translateX(0)" : "translateX(calc(100% + 8px))", left: "4px" }}
                />
              </div>
            </div>

            {/* Form Body */}
            <form className="p-6 space-y-4" onSubmit={handleSubmit}>
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-muted" htmlFor="email">
                  Email address
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                    <Mail className="h-4 w-4" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full rounded-xl bg-bg-panel border border-border pl-10 pr-4 py-2.5 text-sm text-white placeholder-text-muted hover:border-accent-primary/40 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-muted" htmlFor="password">
                    Password
                  </label>
                  {isLogin && (
                    <a href="/auth/forgot-password" className="text-xs font-medium text-accent-primary hover:text-accent-hover transition-colors">
                      Forgot password?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                    <Lock className="h-4 w-4" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    className="w-full rounded-xl bg-bg-panel border border-border pl-10 pr-11 py-2.5 text-sm text-white placeholder-text-muted hover:border-accent-primary/40 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-text-muted" htmlFor="confirmPassword">
                    Confirm password
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full rounded-xl bg-bg-panel border border-border pl-10 pr-11 py-2.5 text-sm text-white placeholder-text-muted hover:border-accent-primary/40 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 transition-all outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Flash Message */}
              {flash && (
                <div className={[
                  "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm animate-fade-in",
                  flash.type === "success"
                    ? "border-status-success/20 bg-status-success/10 text-status-success"
                    : "border-status-error/20 bg-status-error/10 text-status-error",
                ].join(" ")}>
                  {flash.type === "error" && <Activity className="h-4 w-4 mt-0.5 shrink-0" />}
                  {flash.type === "success" && <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                  <span>{flash.text}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-xl bg-accent-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-primary/25 hover:bg-accent-hover transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Processing…</span>
                  </>
                ) : (
                  <>
                    <span>{isLogin ? "Sign In" : "Create Account"}</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </button>

              {/* Toggle mode link */}
              <p className="text-center text-xs text-text-muted">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button
                  type="button"
                  onClick={() => setAuthMode(isLogin ? "signup" : "signin")}
                  className="font-semibold text-accent-primary hover:text-accent-hover transition-colors"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
