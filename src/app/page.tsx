"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Brain, CheckCircle, Eye, EyeOff, Loader2 } from "lucide-react";
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

  const pageTitle = useMemo(() => isLogin ? "Welcome back" : "Create an account", [isLogin]);
  const pageSubtitle = useMemo(() => isLogin ? "Enter your details to access your account." : "Start discovering insights from your data.", [isLogin]);

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
      setFlash({ type: "success", text: "Success. Initializing workspace..." });
      redirectTimerRef.current = setTimeout(() => { router.replace("/dashboard/insight"); }, 900);
    } catch (error) {
      const message = axios.isAxiosError(error) && error.response?.data?.msg
        ? String(error.response.data.msg)
        : isLogin ? "Invalid credentials. Please try again." : "Registration failed. Please retry.";
      setFlash({ type: "error", text: message });
    } finally {
      if (!isLogin) setLoading(false);
      else {
          setTimeout(() => { if (!redirectTimerRef.current) setLoading(false); }, 500);
      }
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#0A0A0A] selection:bg-accent-primary/30 selection:text-white px-4 sm:px-6">
      
      {/* Vercel/Linear Style Ambient Glow: Extremely massive, highly blurred, dark gradient centered behind the form */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-[40rem] w-[40rem] rounded-full bg-accent-primary/10 blur-[120px] mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full max-w-[400px]">
        
        {/* Logo Placement Centered */}
        <div className="mb-8 flex flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-accent-primary to-purple-600 shadow-[0_0_40px_rgba(139,92,246,0.3)] ring-1 ring-white/20 relative">
            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
             <Brain className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#EDEDED]">{pageTitle}</h1>
          <p className="mt-2 text-[14px] text-[#A1A1AA] font-normal">{pageSubtitle}</p>
        </div>

        {/* Auth Floating Card */}
        <div className="rounded-2xl border border-[#27272A] bg-[#121212]/80 p-8 shadow-2xl backdrop-blur-2xl">
          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* Minimalist Input Groups */}
            <div className="space-y-4">
              <div className="space-y-2 relative">
                <label className="text-[13px] font-medium text-[#EDEDED]" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-[#27272A] bg-[#0A0A0A]/50 px-4 py-2.5 text-[14px] text-[#EDEDED] placeholder-[#71717A] shadow-sm transition-colors focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary hovering:border-[#3F3F46]"
                  required
                />
              </div>

              <div className="space-y-2 relative">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-medium text-[#EDEDED]" htmlFor="password">
                    Password
                  </label>
                  {isLogin && (
                    <a href="/auth/forgot-password" className="text-[13px] font-medium text-[#A1A1AA] hover:text-[#EDEDED] transition-colors">
                      Forgot password?
                    </a>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    className="w-full rounded-xl border border-[#27272A] bg-[#0A0A0A]/50 px-4 py-2.5 pr-10 text-[14px] text-[#EDEDED] placeholder-[#71717A] shadow-sm transition-colors focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary hovering:border-[#3F3F46]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#EDEDED] transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password (smooth expanding accordion style) */}
              <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isLogin ? 'h-0 opacity-0 m-0' : 'h-[72px] opacity-100 mt-4'}`}>
                <div className="space-y-2 h-full">
                  <label className="text-[13px] font-medium text-[#EDEDED]" htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full rounded-xl border border-[#27272A] bg-[#0A0A0A]/50 px-4 py-2.5 pr-10 text-[14px] text-[#EDEDED] placeholder-[#71717A] shadow-sm transition-colors focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary hovering:border-[#3F3F46]"
                      required={!isLogin}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717A] hover:text-[#EDEDED] transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Flash Message */}
            {flash && (
              <div className={[
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition-all animate-in fade-in slide-in-from-top-1",
                flash.type === "success"
                  ? "border-[#059669]/30 bg-[#059669]/10 text-[#10B981]"
                  : "border-[#E11D48]/30 bg-[#E11D48]/10 text-[#F43F5E]",
              ].join(" ")}>
                {flash.type === "error" && <Activity className="h-4 w-4 shrink-0" />}
                {flash.type === "success" && <CheckCircle className="h-4 w-4 shrink-0" />}
                <span>{flash.text}</span>
              </div>
            )}

            {/* Primary Action Button - High Contrast Vercel Style */}
            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[14px] font-medium text-black transition-all hover:bg-[#E4E4E7] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin text-black" />
              ) : (
                <>
                  {isLogin ? "Sign In" : "Continue"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Toggle */}
        <p className="mt-8 text-center text-[13px] text-[#A1A1AA]">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => setAuthMode(isLogin ? "signup" : "signin")}
            className="font-medium text-[#EDEDED] hover:underline underline-offset-4 transition-all"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>

        <div className="mt-12 flex justify-center space-x-4 text-[13px] text-[#71717A]">
           <a href="#" className="hover:text-[#D4D4D8] transition-colors">Privacy</a>
           <span>&bull;</span>
           <a href="#" className="hover:text-[#D4D4D8] transition-colors">Terms</a>
           <span>&bull;</span>
           <a href="#" className="hover:text-[#D4D4D8] transition-colors">Security</a>
        </div>
      </div>
    </div>
  );
}
