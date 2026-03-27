"use client";

import { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowRight, ArrowUp, Lock, Sparkles, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  InsightSectionHeader,
  InsightStatCard,
  ReflectionCard,
  TodayStatusCard,
} from "@/components/insight/TwinReportCards";

export interface InsightCardsHandle {
  refresh: () => Promise<void>;
}

export interface InsightCardsProps {
  className?: string;
}

interface InsightState {
  topInterest: string;
  productivityScore: number;
  entertainmentRatio: number;
  currentTrend: "rising" | "stable" | "dropping";
  lastReflection: string;
  updatedAt: string;
  today?: {
    isComplete: boolean;
    activityCount: number;
    mainTheme: string;
    summary: string;
  };
}

const InsightCards = forwardRef<InsightCardsHandle, InsightCardsProps>(
  function InsightCards({ className = "" }, ref) {
    const router = useRouter();
    const { requireAuth } = useAuth();
    const [insight, setInsight] = useState<InsightState | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInsight = useCallback(async () => {
      const headers = requireAuth();
      if (!headers) return;

      try {
        setError(null);
        const response = await axios.get("/api/insight/state", { headers });
        
        if (response.data?.success && response.data?.insight) {
          setInsight(response.data.insight);
        } else {
          setError("Unable to load insights.");
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          requireAuth();
          return;
        }
        setError("Failed to fetch insight data. Please try again.");
      } finally {
        setLoading(false);
      }
    }, [requireAuth]);

    useImperativeHandle(ref, () => ({
      refresh: fetchInsight,
    }), [fetchInsight]);

    useEffect(() => {
      void fetchInsight();
    }, [fetchInsight]);

    const getTrendIcon = (trend: string) => {
      switch (trend) {
        case "rising":
          return <ArrowUp className="h-4 w-4" />;
        case "dropping":
          return <ArrowDown className="h-4 w-4" />;
        case "stable":
        default:
          return <ArrowRight className="h-4 w-4" />;
      }
    };

    const getTrendLabel = (trend: string) => {
      switch (trend) {
        case "rising":
          return "Rising";
        case "dropping":
          return "Dropping";
        case "stable":
        default:
          return "Stable";
      }
    };

    // Loading skeleton
    if (loading) {
      return (
        <div className={`space-y-5 ${className}`}>
          <div className="animate-pulse rounded-2xl border border-border bg-bg-panel p-6">
            <div className="mb-4 h-4 w-32 rounded bg-border" />
            <div className="mb-4 h-10 w-48 rounded bg-border" />
            <div className="h-5 w-4/5 rounded bg-border" />
          </div>
          <div className="animate-pulse rounded-2xl border border-border bg-bg-panel p-6">
            <div className="mb-4 h-4 w-40 rounded bg-border" />
            <div className="h-5 w-full rounded bg-border" />
            <div className="mt-3 h-5 w-3/4 rounded bg-border" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-border bg-bg-panel p-4">
                <div className="mb-3 h-4 w-24 rounded bg-border" />
                <div className="h-6 w-3/5 rounded bg-border" />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Error state
    if (error || !insight) {
      return (
        <div
          className={`rounded-xl border border-status-error/20 bg-status-error/10 px-4 py-3 text-sm text-status-error ${className}`}
        >
          {error || "Insight data unavailable."}
        </div>
      );
    }

    const entertainmentPercentage = Math.round(insight.entertainmentRatio * 100);
    const todaySnapshot = insight.today || {
      isComplete: false,
      activityCount: 0,
      mainTheme: insight.topInterest || "General",
      summary: "You have not logged any activity yet. Your twin is waiting for today's data.",
    };

    return (
      <div className={`grid gap-5 lg:grid-cols-3 ${className}`}>
        {/* Left Column (2/3 width) - Status & Reflection */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <TodayStatusCard
            completed={todaySnapshot.isComplete}
            activityCount={todaySnapshot.activityCount}
            mainTheme={todaySnapshot.mainTheme}
            summary={todaySnapshot.summary}
            onStartCheckIn={() => router.push("/dashboard/checkin")}
          />

          {todaySnapshot.isComplete ? (
            <ReflectionCard
              className="flex-1 animate-fade-in"
              reflection={insight.lastReflection}
            />
          ) : (
            <div className="flex-1 animate-fade-in rounded-2xl border border-white/5 bg-bg-card/40 backdrop-blur-xl p-8 flex flex-col items-center justify-center text-center transition-all duration-500 ease-apple hover:-translate-y-1 hover:shadow-stripe-hover group">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary ring-1 ring-white/10 shadow-inner group-hover:scale-110 group-hover:bg-accent-primary/20 transition-all duration-500 ease-spring">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="mb-1.5 text-lg font-bold text-white tracking-tight">Reflection Locked</h3>
              <p className="text-sm text-text-secondary max-w-sm">
                Your twin needs today&apos;s check-in to generate deep personalized analysis.
              </p>
            </div>
          )}
        </div>

        {/* Right Column (1/3 width) - Insight Stats */}
        <section className="flex flex-col gap-4">
          <div>
            <InsightSectionHeader />
          </div>
          <div className="flex flex-1 flex-col gap-4">
            <InsightStatCard
              label="Main Focus"
              value={insight.topInterest || "General"}
              icon={<Target className="h-4 w-4" />}
              tone="violet"
            />
            <InsightStatCard
              label="Trend"
              value={getTrendLabel(insight.currentTrend)}
              icon={getTrendIcon(insight.currentTrend)}
              tone="emerald"
            />
            <InsightStatCard
              label="Entertainment"
              value={`${entertainmentPercentage}%`}
              icon={<Sparkles className="h-4 w-4" />}
              tone="amber"
            />
          </div>
        </section>
      </div>
    );
  }
);

export default InsightCards;
