"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight } from "lucide-react";
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
      .get("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        if (active) {
          router.replace("/dashboard/insight");
        }
      })
      .catch(() => {
        localStorage.removeItem("token");
      });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const pageTitle = useMemo(() => {
    return isLogin ? "Access Terminal" : "Initialize Unit";
  }, [isLogin]);

  const setAuthMode = (nextMode: AuthMode) => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }

    setMode(nextMode);
    setFlash(null);
    setLoading(false);
    setConfirmPassword("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setFlash({ type: "error", text: "Credentials required." });
      return;
    }

    if (!isLogin) {
      const passwordValidation = validatePassword(password.trim());
      if (!passwordValidation.isValid) {
        setFlash({ type: "error", text: passwordValidation.message });
        return;
      }
      if (password.trim() !== confirmPassword.trim()) {
        setFlash({ type: "error", text: "Passwords do not match." });
        return;
      }
    }

    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }

    setLoading(true);
    setFlash(null);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const response = await axios.post(endpoint, {
        email: email.trim(),
        password: password.trim(),
      });

      const token = String(response.data?.token || "").trim();
      if (!token) {
        setFlash({ type: "error", text: "Authentication failed. Retry." });
        return;
      }

      localStorage.setItem("token", token);

      if (isLogin) {
        router.replace("/dashboard/insight");
        return;
      }

      setFlash({ type: "success", text: "Unit Initialized. Loading system..." });
      redirectTimerRef.current = setTimeout(() => {
        router.replace("/dashboard/insight");
      }, 700);
    } catch (error) {
      const message =
        axios.isAxiosError(error) && error.response?.data?.msg
          ? String(error.response.data.msg)
          : isLogin
            ? "Access denied. Check credentials."
            : "Initialization failed. Retry.";
      setFlash({ type: "error", text: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 md:px-8 md:py-10 bg-bg-base relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md p-8 md:p-10 relative z-10 rounded-2xl border border-border bg-bg-card shadow-2xl">
        <div className="mb-8 text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">{pageTitle}</h1>
          <p className="text-sm text-text-secondary">
            {isLogin ? "Welcome back. Enter your credentials." : "Create your digital twin profile."}
          </p>
        </div>

        <div className="mb-8 flex rounded-xl border border-border bg-bg-panel p-1 text-sm font-semibold relative">
          <button
            type="button"
            className={[
              "w-1/2 rounded-lg py-2 transition-all duration-300 relative z-10",
              isLogin ? "text-white" : "text-text-muted hover:text-text-secondary",
            ].join(" ")}
            onClick={() => setAuthMode("signin")}
          >
            Sign In
          </button>
          <button
            type="button"
            className={[
              "w-1/2 rounded-lg py-2 transition-all duration-300 relative z-10",
              !isLogin ? "text-white" : "text-text-muted hover:text-text-secondary",
            ].join(" ")}
            onClick={() => setAuthMode("signup")}
          >
            Sign Up
          </button>
          {/* Active Tab Background indicator */}
          <div 
            className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-border shadow-sm transition-transform duration-300 ease-in-out"
            style={{ 
              transform: isLogin ? "translateX(0)" : "translateX(calc(100% + 8px))", 
              left: "4px" 
            }}
          />
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="user@system.com"
              autoComplete="email"
              className="w-full rounded-xl bg-bg-panel border border-border px-4 py-3 text-sm text-white placeholder-text-muted hover:border-accent-primary/50 focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all outline-none"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted" htmlFor="password">
                Password
              </label>
              {isLogin && (
                <a href="/auth/forgot-password" className="text-xs font-medium text-accent-primary hover:text-accent-hover transition-colors">
                  Forgot?
                </a>
              )}
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete={isLogin ? "current-password" : "new-password"}
              className="w-full rounded-xl bg-bg-panel border border-border px-4 py-3 text-sm text-white placeholder-text-muted hover:border-accent-primary/50 focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all outline-none"
              required
            />
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full rounded-xl bg-bg-panel border border-border px-4 py-3 text-sm text-white placeholder-text-muted hover:border-accent-primary/50 focus:border-accent-primary focus:ring-1 focus:ring-accent-primary transition-all outline-none"
                required
              />
            </div>
          )}

          {flash && (
            <div
              className={[
                "rounded-xl border px-4 py-3 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-1",
                flash.type === "success"
                  ? "border-green-500/20 bg-green-500/10 text-green-400"
                  : "border-red-500/20 bg-red-500/10 text-red-400",
              ].join(" ")}
            >
              {flash.type === "error" && <Activity className="h-4 w-4 shrink-0" />}
              {flash.text}
            </div>
          )}

          <button 
            className="w-full rounded-xl bg-accent-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-primary/20 hover:bg-accent-hover hover:shadow-accent-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group" 
            disabled={loading} 
            type="submit"
          >
            {loading ? "Processing..." : isLogin ? "Access System" : "Initialize Account"}
            {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
          </button>
        </form>
      </div>
    </div>
  );
}
