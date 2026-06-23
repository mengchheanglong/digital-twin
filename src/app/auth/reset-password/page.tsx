"use client";

import { useEffect, useState, Suspense } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Key, CheckCircle } from "lucide-react";
import Link from "next/link";
import { validatePassword } from "@/lib/validation";
import { Button, Card, FormField, Input, useToast } from "@/components/ui";
import ThemeToggle from "@/components/theme/ThemeToggle";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const { toast } = useToast();

  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [otpError, setOtpError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    setPasswordError("");
    setConfirmError("");
    setSuccessMsg(null);

    let hasError = false;
    if (!otp || otp.length !== 6) {
      setOtpError("Please enter a valid 6-digit code.");
      hasError = true;
    }
    if (password !== confirmPassword) {
      setConfirmError("Passwords do not match.");
      hasError = true;
    }
    const validation = validatePassword(password);
    if (!validation.isValid) {
      setPasswordError(validation.message);
      hasError = true;
    }
    if (hasError) return;

    setLoading(true);

    try {
      const res = await axios.post("/api/auth/reset-password", {
        email: emailParam,
        otp,
        newPassword: password,
      });

      setSuccessMsg(res.data.msg || "Credentials updated. Redirecting...");

      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (error) {
      const msg =
        axios.isAxiosError(error) && error.response?.data?.msg
          ? String(error.response.data.msg)
          : "Update failed. Code may be invalid/expired.";
      toast({
        title: "Reset failed",
        description: msg,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-base px-4 sm:px-6 lg:px-8">
      {/* Ambient orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -left-20 -top-20 h-[32rem] w-[32rem] rounded-full bg-accent-primary/15 blur-[100px] animate-float"
          style={{ animationDuration: "8s" }}
        />
        <div
          className="absolute -right-20 bottom-0 h-[28rem] w-[28rem] rounded-full bg-accent-glow/10 blur-[100px] animate-float"
          style={{ animationDelay: "2s", animationDuration: "10s" }}
        />
      </div>

      {/* Theme toggle */}
      {mounted && (
        <div className="absolute right-4 top-4 z-50">
          <ThemeToggle size="md" />
        </div>
      )}

      <div className="relative z-10 w-full max-w-md">
        <Card variant="glass" glow className="animate-scale-in p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-accent-subtle text-accent-primary shadow-glow-soft ring-1 ring-accent-primary/20">
              <Key className="h-6 w-6" />
            </div>
            <h2 className="mt-6 text-2xl font-bold tracking-tight text-text-primary">
              Reset Credentials
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Enter the 6-digit code sent to{" "}
              <strong className="text-text-primary">{emailParam}</strong> and
              your new password.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <FormField
              label="Verification Code"
              htmlFor="otp"
              error={otpError}
            >
              <Input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, ""));
                  if (otpError) setOtpError("");
                }}
                className="text-center text-lg tracking-[0.5em]"
                placeholder="000000"
                aria-invalid={!!otpError}
              />
            </FormField>

            <FormField
              label="New Password"
              htmlFor="password"
              error={passwordError}
            >
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                placeholder="New password"
                aria-invalid={!!passwordError}
              />
            </FormField>

            <FormField
              label="Confirm Password"
              htmlFor="confirmPassword"
              error={confirmError}
            >
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmError) setConfirmError("");
                }}
                placeholder="Confirm new password"
                aria-invalid={!!confirmError}
              />
            </FormField>

            {successMsg && (
              <div className="surface-success flex animate-fade-in items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium">
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
              Update Credentials
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/auth/forgot-password"
              className="text-sm font-medium text-accent-primary transition-colors hover:text-accent-hover"
            >
              Resend Code
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-bg-base text-accent-primary">
          Loading System...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
