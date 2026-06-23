"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Mail } from "lucide-react";
import Link from "next/link";
import { Button, Card, FormField, Input, useToast } from "@/components/ui";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "error",
      });
      return;
    }

    setLoading(true);
    setSuccessMsg(null);

    try {
      const res = await axios.post("/api/auth/forgot-password", { email });
      setSuccessMsg(res.data.msg || "Link dispatched. Redirecting...");

      setTimeout(() => {
        const params = new URLSearchParams();
        params.set("email", email);
        router.push(`/auth/reset-password?${params.toString()}`);
      }, 1000);
    } catch (error) {
      const msg =
        axios.isAxiosError(error) && error.response?.data?.msg
          ? String(error.response.data.msg)
          : "Request failed. Retry.";
      toast({
        title: "Request failed",
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
              <Mail className="h-6 w-6" />
            </div>
            <h2 className="mt-6 text-2xl font-bold tracking-tight text-text-primary">
              Account Recovery
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Enter your email to receive a reset link.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <FormField label="Email address" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@system.com"
                leftIcon={<Mail className="h-4 w-4" />}
              />
            </FormField>

            {successMsg && (
              <div className="surface-success flex animate-fade-in items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium">
                <Mail className="h-4 w-4 shrink-0" />
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
              Send Reset Link
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/"
              className="inline-flex items-center text-sm font-medium text-accent-primary transition-colors hover:text-accent-hover"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Access Terminal
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
