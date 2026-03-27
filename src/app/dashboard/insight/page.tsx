"use client";

import { useEffect, useRef, useState } from "react";
import InsightCards, { InsightCardsHandle } from "@/components/InsightCards";
import ForecastPanel from "@/components/insight/ForecastPanel";
import WeeklyPlanCard from "@/components/insight/WeeklyPlanCard";
import { Flame, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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
    <div className="mx-auto w-full max-w-5xl animate-fade-in space-y-6 pb-10 text-text-primary">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary border border-accent-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Today&apos;s Twin Report</h1>
            <p className="text-sm text-text-secondary mt-0.5">A daily perspective from your digital twin.</p>
          </div>
        </div>
        <div className="group flex items-center gap-3 rounded-2xl border border-orange-500/20 bg-bg-panel px-4 py-2.5 transition-all shadow-[0_0_15px_rgba(249,115,22,0.05)] hover:border-orange-500/40 hover:bg-bg-panel/80 hover:shadow-[0_0_30px_rgba(249,115,22,0.15)] cursor-default">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10 text-orange-500 ring-1 ring-orange-500/30 transition-all duration-300 group-hover:scale-110 group-hover:ring-orange-500/50 group-hover:bg-orange-500/20">
            <Flame className="h-4 w-4 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
          </div>
          <div className="flex flex-col pr-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted leading-none mb-1">Day Streak</span>
            <span className="text-sm font-bold text-orange-400 leading-none">{streak}</span>
          </div>
        </div>
      </div>

      {/* Insight Cards */}
      <InsightCards ref={insightCardsRef} />

      {/* 7-Day Wellness Forecast */}
      <ForecastPanel />

      {/* Weekly Blueprint */}
      <WeeklyPlanCard />
    </div>
  );
}
