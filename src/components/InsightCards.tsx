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
        if (!insight) {
          setLoading(true);
        }
        setError(null);
        const response = await axios.get("/api/insight/state", { headers });
        
        if (response.data?.success && response.data?.insight) {
          setInsight(response.data.insight);
        } else {
          setError("Unable to load insights.");
        }
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          router.push("/");
          return;
        }
        setError("Failed to fetch insight data. Please try again.");
      } finally {
        setLoading(false);
      }
    }, [requireAuth, insight, router]);

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
      <div className={`space-y-5 ${className}`}>
        <TodayStatusCard
          completed={todaySnapshot.isComplete}
          activityCount={todaySnapshot.activityCount}
          mainTheme={todaySnapshot.mainTheme}
          summary={todaySnapshot.summary}
          onStartCheckIn={() => router.push("/dashboard/checkin")}
        />

        {todaySnapshot.isComplete ? (
          <ReflectionCard className="animate-fade-in" reflection={insight.lastReflection} />
        ) : (
          <div className="animate-fade-in rounded-xl border border-border bg-bg-panel/75 px-4 py-3 text-sm text-text-secondary transition-all duration-300 hover:-translate-y-0.5 hover:border-accent-primary/30 hover:bg-[#171b2c] hover:shadow-[0_12px_30px_rgba(0,0,0,0.25)]">
            <span className="inline-flex items-center gap-2 font-medium text-accent-glow">
              <Lock className="h-4 w-4" />
              Daily Reflection unlocks after today&apos;s check-in.
            </span>
          </div>
        )}

        <section className="space-y-3">
          <InsightSectionHeader />
          <div className="grid gap-4 md:grid-cols-3">
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
