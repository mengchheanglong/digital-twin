"use client";

import { useEffect, useRef, useState } from "react";
import InsightCards, { InsightCardsHandle } from "@/components/InsightCards";
import ForecastPanel from "@/components/insight/ForecastPanel";
import WeeklyPlanCard from "@/components/insight/WeeklyPlanCard";
import { Flame, Sparkles } from "lucide-react";
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
          const nextStreak = data?.profile?.dailyStreak ?? data?.profile?.currentStreak;
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
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-subtle text-accent-primary border border-accent-primary/20 shadow-glow-soft">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              {getGreeting()}
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">{formatDate()}</p>
          </div>
        </div>
        <div className="group flex items-center gap-3 rounded-2xl border border-status-warning/20 bg-bg-panel px-4 py-2.5 transition-all shadow-card hover:border-status-warning/40 hover:bg-bg-panel/80 hover:shadow-elevated cursor-default">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-status-warning/10 text-status-warning ring-1 ring-status-warning/30 transition-all duration-300 group-hover:scale-110 group-hover:ring-status-warning/50 group-hover:bg-status-warning/20">
            <Flame className="h-4 w-4" />
          </div>
          <div className="flex flex-col pr-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted leading-none mb-1">Day Streak</span>
            <span className="text-sm font-bold text-status-warning leading-none">{streak}</span>
          </div>
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
