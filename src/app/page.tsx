"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Brain,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Sparkles,
} from "lucide-react";
import { validatePassword } from "@/lib/validation";
import { Button, Card, FormField, Input, useToast } from "@/components/ui";
import ThemeToggle from "@/components/theme/ThemeToggle";

type AuthMode = "signin" | "signup";

function resolveMode(value: string | null): AuthMode {
  return value === "signup" ? "signup" : "signin";
}

export default function AuthPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLogin = mode === "signin";

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
      .then(() => {
        if (active) router.replace("/dashboard/insight");
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
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, []);

  const setAuthMode = (nextMode: AuthMode) => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    setMode(nextMode);
    setSuccessMsg(null);
    setLoading(false);
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setEmailError("");
    setPasswordError("");
    setConfirmError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailError("");
    setPasswordError("");
    setConfirmError("");
    setSuccessMsg(null);

    let hasError = false;
    if (!email.trim()) {
      setEmailError("Please enter your email.");
      hasError = true;
    }
    if (!password.trim()) {
      setPasswordError("Please enter your password.");
      hasError = true;
    }
    if (!isLogin) {
      const pv = validatePassword(password.trim());
      if (!pv.isValid) {
        setPasswordError(pv.message);
        hasError = true;
      }
      if (password.trim() !== confirmPassword.trim()) {
        setConfirmError("Passwords do not match.");
        hasError = true;
      }
    }
    if (hasError) return;

    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const response = await axios.post(endpoint, {
        email: email.trim(),
        password: password.trim(),
      });
      const token = String(response.data?.token || "").trim();
      if (!token) {
        toast({
          title: "Authentication failed",
          description: "Please retry.",
          variant: "error",
        });
        return;
      }
      localStorage.setItem("token", token);
      if (isLogin) {
        router.replace("/dashboard/insight");
        return;
      }
      const { default: confetti } = await import("canvas-confetti");
      const rootStyle = getComputedStyle(document.documentElement);
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: [
          rootStyle.getPropertyValue("--color-accent-primary").trim(),
          rootStyle.getPropertyValue("--color-accent-glow").trim(),
          rootStyle.getPropertyValue("--color-status-success").trim(),
          rootStyle.getPropertyValue("--color-status-warning").trim(),
        ],
      });
      setSuccessMsg("Success. Initializing workspace...");
      redirectTimerRef.current = setTimeout(() => {
        router.replace("/dashboard/insight");
      }, 900);
    } catch (error) {
      const message =
        axios.isAxiosError(error) && error.response?.data?.msg
          ? String(error.response.data.msg)
          : isLogin
          ? "Invalid credentials. Please try again."
          : "Registration failed. Please retry.";
      toast({
        title: isLogin ? "Sign in failed" : "Sign up failed",
        description: message,
        variant: "error",
      });
    } finally {
      if (!isLogin) setLoading(false);
      else {
        setTimeout(() => {
          if (!redirectTimerRef.current) setLoading(false);
        }, 500);
      }
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-base px-4 sm:px-6 lg:px-8">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -left-20 -top-20 h-[32rem] w-[32rem] rounded-full bg-accent-primary/20 blur-[100px] animate-float"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="absolute -right-20 bottom-0 h-[28rem] w-[28rem] rounded-full bg-accent-glow/15 blur-[100px] animate-float"
          style={{ animationDelay: "2s", animationDuration: "10s" }}
        />
        <div
          className="absolute left-1/3 top-1/2 h-[24rem] w-[24rem] rounded-full bg-status-info/10 blur-[100px] animate-float"
          style={{ animationDelay: "4s", animationDuration: "12s" }}
        />
      </div>

      {/* Theme toggle */}
      {mounted && (
        <div className="absolute right-4 top-4 z-50">
          <ThemeToggle size="md" />
        </div>
      )}

      <div className="relative z-10 flex w-full max-w-5xl items-center gap-12">
        {/* Left brand panel */}
        <div className="hidden flex-1 flex-col items-start justify-center lg:flex">
          <div className="animate-float mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-accent-primary to-accent-hover shadow-glow-soft ring-1 ring-white/20">
            <Brain className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-text-primary">
            Digital Twin
          </h1>
          <p className="mt-4 max-w-sm text-xl leading-relaxed text-text-secondary">
            Your personal intelligence companion for self-reflection, habit
            tracking, and growth.
          </p>
          <div className="mt-8 flex items-center gap-3 text-sm text-text-muted">
            <Sparkles className="h-4 w-4 text-accent-primary" />
            <span>Insights that adapt to you</span>
          </div>
          <div className="mt-3 flex items-center gap-3 text-sm text-text-muted">
            <Lock className="h-4 w-4 text-accent-primary" />
            <span>Privacy-first, always encrypted</span>
          </div>
        </div>

        {/* Right form panel */}
        <div className="mx-auto w-full max-w-[420px] lg:mx-0">
          <Card variant="glass" glow className="animate-scale-in p-8">
            {/* Segmented mode toggle */}
            <div className="mb-8 flex rounded-xl border border-border bg-bg-input p-1">
              <button
                type="button"
                onClick={() => setAuthMode("signin")}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-200 ${
                  isLogin
                    ? "bg-bg-card text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all duration-200 ${
                  !isLogin
                    ? "bg-bg-card text-text-primary shadow-sm"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Sign Up
              </button>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <FormField label="Email" htmlFor="email" error={emailError}>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError("");
                  }}
                  placeholder="name@example.com"
                  autoComplete="email"
                  leftIcon={<Mail className="h-4 w-4" />}
                  aria-invalid={!!emailError}
                  required
                />
              </FormField>

              <FormField
                label="Password"
                htmlFor="password"
                error={passwordError}
              >
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError("");
                    }}
                    placeholder="••••••••"
                    autoComplete={
                      isLogin ? "current-password" : "new-password"
                    }
                    className="pr-10"
                    aria-invalid={!!passwordError}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-primary"
                    tabIndex={-1}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </FormField>

              {!isLogin && (
                <FormField
                  label="Confirm Password"
                  htmlFor="confirmPassword"
                  error={confirmError}
                >
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (confirmError) setConfirmError("");
                      }}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="pr-10"
                      aria-invalid={!!confirmError}
                      required={!isLogin}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-primary"
                      tabIndex={-1}
                      aria-label={
                        showConfirmPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormField>
              )}

              {isLogin && (
                <div className="flex justify-end">
                  <a
                    href="/auth/forgot-password"
                    className="text-sm font-medium text-text-secondary transition-colors hover:text-text-primary"
                  >
                    Forgot password?
                  </a>
                </div>
              )}

              {successMsg && (
                <div className="surface-success flex animate-fade-in items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  {successMsg}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                loading={loading}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                {isLogin ? "Sign In" : "Continue"}
              </Button>
            </form>
          </Card>

          <p className="mt-8 text-center text-sm text-text-secondary">
            {isLogin
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              type="button"
              onClick={() => setAuthMode(isLogin ? "signup" : "signin")}
              className="font-semibold text-text-primary underline-offset-4 transition-all hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>

          <div className="mt-10 flex items-center justify-center gap-3 text-xs text-text-muted">
            <a
              href="#"
              className="transition-colors hover:text-text-secondary"
            >
              Privacy
            </a>
            <span className="text-border-hover">&bull;</span>
            <a
              href="#"
              className="transition-colors hover:text-text-secondary"
            >
              Terms
            </a>
            <span className="text-border-hover">&bull;</span>
            <a
              href="#"
              className="transition-colors hover:text-text-secondary"
            >
              Security
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
