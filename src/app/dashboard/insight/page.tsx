"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Flame,
  Gauge,
  Lock,
  Minus,
  RefreshCw,
  Sparkles,
  Swords,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button, ProgressBar, Skeleton } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { USER_PROGRESSION_UPDATE_EVENT } from "@/lib/progression-events";
import type { MobileToday } from "@/lib/mobile-today";
import { getTodayHeadline, getTrendLabel, getXpPercent } from "./todayView";

const ForecastPanel = dynamic(() => import("@/components/insight/ForecastPanel"), {
  loading: () => <Skeleton className="h-80 w-full rounded-2xl" />,
});

const WeeklyPlanCard = dynamic(() => import("@/components/insight/WeeklyPlanCard"), {
  loading: () => <Skeleton className="h-80 w-full rounded-2xl" />,
});

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function ActionIcon({ href }: { href: string }) {
  if (href.includes("checkin")) return <CheckCircle2 className="h-4.5 w-4.5" />;
  if (href.includes("quest")) return <Swords className="h-4.5 w-4.5" />;
  return <Sparkles className="h-4.5 w-4.5" />;
}

function TodaySkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-10">
      <div className="flex items-center gap-3 py-2">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-8 w-52 rounded-lg" />
          <Skeleton className="h-4 w-64 max-w-[70vw] rounded" />
        </div>
      </div>
      <Skeleton className="h-[21rem] w-full rounded-2xl sm:h-[18rem]" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.6fr)]">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default function InsightPage() {
  const { requireAuth } = useAuth();
  const [today, setToday] = useState<MobileToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWeekly, setShowWeekly] = useState(false);

  const fetchToday = useCallback(async () => {
    const headers = requireAuth();
    if (!headers) return;

    try {
      setError("");
      const response = await fetch("/api/mobile/today", {
        headers,
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Today could not be loaded.");
      }

      const payload = (await response.json()) as {
        success?: boolean;
        today?: MobileToday;
      };
      if (!payload.success || !payload.today) {
        throw new Error("Today could not be loaded.");
      }
      setToday(payload.today);
    } catch {
      setError("Your daily brief is temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }, [requireAuth]);

  useEffect(() => {
    void fetchToday();

    const refresh = () => void fetchToday();
    window.addEventListener("focus", refresh);
    window.addEventListener(USER_PROGRESSION_UPDATE_EVENT, refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener(USER_PROGRESSION_UPDATE_EVENT, refresh);
    };
  }, [fetchToday]);

  if (loading) return <TodaySkeleton />;

  if (error || !today) {
    return (
      <div className="mx-auto flex min-h-[65vh] w-full max-w-xl items-center justify-center px-2">
        <section className="w-full rounded-2xl border border-border bg-bg-card p-6 text-center shadow-card sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-bg-panel text-accent-primary">
            <RefreshCw className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-xl font-black text-text-primary">Daily brief unavailable</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
            {error || "Your daily brief could not be loaded."}
          </p>
          <Button className="mt-5" onClick={() => void fetchToday()} leftIcon={<RefreshCw className="h-4 w-4" />}>
            Try again
          </Button>
        </section>
      </div>
    );
  }

  const checkedIn = today.checkIn.completedToday;
  const hasWeeklyBaseline = today.checkIn.historyCount >= 3;
  const quest = today.quest.current;
  const xpPercent = getXpPercent(today.user.currentXP, today.user.requiredXP);
  const trendLabel = getTrendLabel(today.insight.trend);
  const entertainment = Math.round(today.insight.entertainmentRatio * 100);
  const TrendIcon = today.insight.trend === "rising"
    ? TrendingUp
    : today.insight.trend === "dropping"
      ? TrendingDown
      : Minus;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pb-10 text-text-primary sm:space-y-6">
      <header className="flex items-start justify-between gap-3 animate-fade-in">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent-primary/25 bg-accent-subtle text-accent-primary shadow-inner-glow sm:h-14 sm:w-14">
            <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" />
            <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-bg-base bg-status-success" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">
              {formatDate()}
            </p>
            <h1 className="mt-1 text-2xl font-black leading-tight tracking-normal text-text-primary sm:text-3xl">
              {getGreeting()}
            </h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-text-secondary">
              One clear view of what matters next.
            </p>
          </div>
        </div>

        <div className="hidden min-w-[10.5rem] rounded-2xl border border-border bg-bg-panel p-3 sm:block">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">
              Level {today.user.level}
            </span>
            <span className="text-xs font-black text-accent-primary tabular-nums">{xpPercent}%</span>
          </div>
          <ProgressBar value={today.user.currentXP} max={today.user.requiredXP} size="sm" className="mt-2" />
        </div>
      </header>

      <section className="relative overflow-hidden rounded-[1.5rem] border border-border bg-[linear-gradient(145deg,rgba(124,92,252,0.12),rgba(255,255,255,0.025)_42%,rgba(255,255,255,0.015))] shadow-elevated animate-fade-in">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent-primary/80 to-transparent" />
        <div className="relative z-10 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-accent-primary">
              Next move
            </p>
            <span className={[
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[10px] font-black uppercase tracking-[0.12em]",
              checkedIn
                ? "border-status-success/25 bg-status-success/10 text-status-success"
                : "border-status-warning/25 bg-status-warning/10 text-status-warning",
            ].join(" ")}>
              {checkedIn ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Gauge className="h-3.5 w-3.5" />}
              {checkedIn ? "Check-in complete" : "Check-in pending"}
            </span>
          </div>

          <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-end">
            <div>
              <h2 className="max-w-2xl text-2xl font-black leading-tight tracking-normal text-text-primary sm:text-3xl">
                {getTodayHeadline(today)}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
                {today.quest.nextAction.reason}
              </p>

              <div className="mt-5 grid gap-2 min-[420px]:flex min-[420px]:flex-wrap">
                <Link
                  href={today.launcher.primaryHref}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-accent-primary px-4 py-2.5 text-sm font-bold text-white shadow-glow-soft transition-all duration-200 hover:bg-accent-hover hover:shadow-glow active:scale-[0.98] focus-ring"
                >
                  <ActionIcon href={today.launcher.primaryHref} />
                  <span>{today.launcher.primaryLabel}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={today.launcher.secondaryHref}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-border bg-bg-panel px-4 py-2.5 text-sm font-bold text-text-primary transition-all duration-200 hover:border-border-hover hover:bg-bg-hover active:scale-[0.98] focus-ring"
                >
                  <ActionIcon href={today.launcher.secondaryHref} />
                  <span>{today.launcher.secondaryLabel}</span>
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-border-subtle bg-black/15 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">Level</p>
                  <p className="mt-1 text-2xl font-black text-text-primary tabular-nums">{today.user.level}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">XP</p>
                  <p className="mt-1 text-sm font-black text-accent-primary tabular-nums">
                    {today.user.currentXP} / {today.user.requiredXP}
                  </p>
                </div>
              </div>
              <ProgressBar value={today.user.currentXP} max={today.user.requiredXP} size="sm" className="mt-3" />
            </div>
          </div>

          {quest && (
            <div className="mt-5 border-t border-border-subtle pt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">
                    Current quest
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-text-primary">{quest.goal}</p>
                </div>
                <span className="shrink-0 text-sm font-black text-accent-primary tabular-nums">{quest.progress}%</span>
              </div>
              <ProgressBar value={quest.progress} size="sm" className="mt-3" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 border-t border-border-subtle bg-black/10">
          <div className="min-w-0 px-3 py-3.5 sm:px-5">
            <p className="font-mono text-[9px] font-black uppercase tracking-[0.14em] text-text-muted">Check-in</p>
            <p className="mt-1 truncate text-sm font-black text-text-primary">{checkedIn ? "Done" : "Pending"}</p>
          </div>
          <div className="min-w-0 border-x border-border-subtle px-3 py-3.5 sm:px-5">
            <p className="font-mono text-[9px] font-black uppercase tracking-[0.14em] text-text-muted">Streak</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-black text-text-primary tabular-nums">
              <Flame className="h-3.5 w-3.5 text-status-warning" /> {today.user.streak}d
            </p>
          </div>
          <div className="min-w-0 px-3 py-3.5 sm:px-5">
            <p className="font-mono text-[9px] font-black uppercase tracking-[0.14em] text-text-muted">Quest</p>
            <p className="mt-1 truncate text-sm font-black text-text-primary">{quest ? `${quest.progress}%` : "Open"}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)]">
        <section className="rounded-2xl border border-border bg-bg-card p-4 shadow-card sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">
                Daily reflection
              </p>
              <h2 className="mt-1 text-base font-black text-text-primary">
                {checkedIn ? "What your day is showing" : "Build today\u2019s baseline"}
              </h2>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-panel text-accent-primary">
              {checkedIn ? <Sparkles className="h-4.5 w-4.5" /> : <Lock className="h-4.5 w-4.5" />}
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-text-secondary">
            {checkedIn
              ? today.insight.reflection
              : "Complete the daily check-in to turn your signals into a grounded reflection and a clearer next step."}
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-bg-card shadow-card">
          <div className="border-b border-border-subtle px-4 py-3.5 sm:px-5">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">Live signals</p>
          </div>
          <div className="divide-y divide-border-subtle">
            <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
              <span className="flex items-center gap-2 text-sm font-semibold text-text-secondary"><Target className="h-4 w-4 text-accent-primary" /> Focus</span>
              <span className="max-w-[50%] truncate text-sm font-black text-text-primary">{today.insight.topInterest}</span>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
              <span className="flex items-center gap-2 text-sm font-semibold text-text-secondary"><TrendIcon className="h-4 w-4 text-status-info" /> Trend</span>
              <span className="text-sm font-black text-text-primary">{trendLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5">
              <span className="flex items-center gap-2 text-sm font-semibold text-text-secondary"><Gauge className="h-4 w-4 text-status-warning" /> Entertainment</span>
              <span className="text-sm font-black text-text-primary tabular-nums">{entertainment}%</span>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-bg-panel/60">
        <button
          type="button"
          aria-expanded={hasWeeklyBaseline ? showWeekly : false}
          disabled={!hasWeeklyBaseline}
          onClick={() => setShowWeekly((current) => !current)}
          className="flex min-h-[64px] w-full items-center justify-between gap-4 px-4 py-3 text-left transition-colors enabled:hover:bg-bg-hover focus-ring disabled:cursor-default sm:px-5"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-card text-accent-primary">
              {hasWeeklyBaseline ? <BarChart3 className="h-4.5 w-4.5" /> : <Lock className="h-4.5 w-4.5 text-text-muted" />}
            </div>
            <div className="min-w-0">
              <p className="truncate font-mono text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">
                {hasWeeklyBaseline ? "Review" : "3 check-ins required"}
              </p>
              <p className="truncate text-sm font-black text-text-primary">Weekly outlook &amp; plan</p>
            </div>
          </div>
          {hasWeeklyBaseline ? (
            <ChevronDown className={`h-5 w-5 shrink-0 text-text-muted transition-transform duration-200 ${showWeekly ? "rotate-180" : ""}`} />
          ) : (
            <span className="shrink-0 font-mono text-[10px] font-black text-text-muted tabular-nums">
              {Math.min(today.checkIn.historyCount, 3)} / 3
            </span>
          )}
        </button>

        {hasWeeklyBaseline && showWeekly && (
          <div className="grid gap-4 border-t border-border p-3 animate-fade-in sm:p-4 lg:grid-cols-2">
            <ForecastPanel />
            <WeeklyPlanCard />
          </div>
        )}
      </section>

      <div className="flex justify-center">
        <Link href="/dashboard/analytics" className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary focus-ring">
          <BarChart3 className="h-4 w-4" />
          View deeper analytics
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
