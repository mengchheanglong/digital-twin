"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import InsightCards, { InsightCardsHandle } from "@/components/InsightCards";
import ForecastPanel from "@/components/insight/ForecastPanel";
import WeeklyPlanCard from "@/components/insight/WeeklyPlanCard";
import { ArrowRight, CheckCircle2, Flame, Sparkles, Swords } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function InsightPage() {
  const insightCardsRef = useRef<InsightCardsHandle>(null);
  const [streak, setStreak] = useState<number>(0);
  const { getAuthHeaders } = useAuth();

  useEffect(() => {
    let mounted = true;

    const fetchStreak = async () => {
      const headers = getAuthHeaders();
      if (!headers) return;

      try {
        const profileRes = await fetch("/api/profile", {
          headers,
          cache: "no-store",
        });

        if (profileRes.ok && mounted) {
          const data = await profileRes.json();
          const nextStreak =
            data?.profile?.dailyStreak ?? data?.profile?.currentStreak;
          if (nextStreak !== undefined) {
            setStreak(Number(nextStreak) || 0);
          }
        }
      } catch (error) {
        console.error("Failed to refresh streak data", error);
      }
    };

    const refreshDashboardData = async () => {
      try {
        await fetchStreak();
        await insightCardsRef.current?.refresh();
      } catch (error) {
        console.error("Failed to refresh dashboard data", error);
      }
    };

    void fetchStreak();

    const onFocus = () => void refreshDashboardData();
    window.addEventListener("focus", onFocus);

    return () => {
      mounted = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [getAuthHeaders]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-12 text-text-primary">
      {/* Header */}
      <div className="flex flex-col gap-4 animate-fade-in sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          {/* Left: greeting */}
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="relative shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-primary to-accent-hover shadow-glow-soft ring-1 ring-accent-primary/30 sm:h-14 sm:w-14">
                <Sparkles className="h-6 w-6 text-white sm:h-7 sm:w-7" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-status-success border-2 border-bg-base shadow-sm" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted mb-0.5">
                {formatDate()}
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight text-text-primary leading-tight sm:text-3xl">
                {getGreeting()}
              </h1>
              <p className="mt-1 max-w-xl text-sm text-text-secondary">
                Your digital twin is ready. Here&apos;s today&apos;s overview.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:flex sm:flex-wrap">
            <Link
              href="/dashboard/checkin"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-primary to-accent-hover px-4 py-2.5 text-sm font-semibold text-white shadow-glow-soft transition-all duration-300 ease-apple hover:shadow-glow active:scale-[0.98] focus-ring"
            >
              <CheckCircle2 className="h-4.5 w-4.5" />
              <span>Check in</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard/quest"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-border bg-bg-card px-4 py-2.5 text-sm font-semibold text-text-primary transition-all duration-300 ease-apple hover:border-border-hover hover:bg-bg-hover active:scale-[0.98] focus-ring"
            >
              <Swords className="h-4.5 w-4.5 text-accent-primary" />
              <span>Continue quest</span>
            </Link>
          </div>
        </div>

        {/* Right: Streak widget */}
        <div className="group relative flex min-h-[112px] shrink-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-2xl border border-status-warning/25 bg-bg-panel px-6 py-3.5 cursor-default transition-all duration-300 ease-apple hover:border-status-warning/50 hover:shadow-elevated sm:min-w-[150px]">
          {/* Background glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-status-warning/8 to-transparent pointer-events-none" />
          <span className="relative z-10 text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted">
            Day Streak
          </span>
          <div className="relative z-10 flex items-center gap-2 py-0.5">
            <Flame className="h-6 w-6 text-status-warning animate-animal-float" />
            <span className="text-4xl font-black text-status-warning tabular-nums leading-none">
              {streak}
            </span>
          </div>
          <span className="relative z-10 text-[10px] font-medium text-text-muted">
            {streak === 1 ? "day in a row" : "days in a row"}
          </span>
        </div>
      </div>

      {/* Insight Cards */}
      <InsightCards ref={insightCardsRef} />

      {/* Bottom grid: Forecast + Weekly Plan */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="animate-fade-in" style={{ animationDelay: "300ms" }}>
          <ForecastPanel />
        </div>
        <div className="animate-fade-in" style={{ animationDelay: "400ms" }}>
          <WeeklyPlanCard />
        </div>
      </div>
    </div>
  );
}
