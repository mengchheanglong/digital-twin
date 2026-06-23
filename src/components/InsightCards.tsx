"use client";

import { useCallback, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowRight, ArrowUp, Lock, Sparkles, Target } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton, EmptyState } from "@/components/ui";
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

    const getTrendTone = (trend: string): "emerald" | "amber" | "rose" => {
      switch (trend) {
        case "rising":
          return "emerald";
        case "dropping":
          return "rose";
        case "stable":
        default:
          return "amber";
      }
    };

    // Loading skeleton
    if (loading) {
      return (
        <div className={`space-y-5 ${className}`}>
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-5">
              <div className="rounded-2xl border border-border bg-bg-card p-7 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <Skeleton width={80} height={12} rounded="md" />
                    <Skeleton width={160} height={32} rounded="lg" />
                  </div>
                  <Skeleton width={80} height={28} rounded="full" />
                </div>
                <Skeleton width="80%" height={20} rounded="md" />
                <div className="flex flex-wrap gap-2 pt-1">
                  <Skeleton width={100} height={24} rounded="xl" />
                  <Skeleton width={120} height={24} rounded="xl" />
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-bg-card p-6 space-y-4">
                <Skeleton width={140} height={28} rounded="xl" />
                <Skeleton width="100%" height={20} rounded="md" />
                <Skeleton width="90%" height={20} rounded="md" />
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton width={120} height={28} rounded="xl" />
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl border border-border bg-bg-card p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <Skeleton width={60} height={14} rounded="md" />
                      <Skeleton width={36} height={36} rounded="xl" />
                    </div>
                    <Skeleton width="60%" height={28} rounded="lg" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Error / empty state
    if (error || !insight) {
      return (
        <EmptyState
          className={className}
          icon={<Sparkles className="h-6 w-6 text-text-muted" />}
          title="Insights unavailable"
          description={error || "Your twin is still gathering data. Check back soon."}
          action={{
            label: "Try again",
            onClick: () => void fetchInsight(),
          }}
        />
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
          <div className="animate-fade-in" style={{ animationDelay: "0ms" }}>
            <TodayStatusCard
              completed={todaySnapshot.isComplete}
              activityCount={todaySnapshot.activityCount}
              mainTheme={todaySnapshot.mainTheme}
              summary={todaySnapshot.summary}
              onStartCheckIn={() => router.push("/dashboard/checkin")}
            />
          </div>

          {todaySnapshot.isComplete ? (
            <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
              <ReflectionCard
                className="flex-1"
                reflection={insight.lastReflection}
              />
            </div>
          ) : (
            <div
              className="flex-1 animate-fade-in rounded-2xl border border-border-subtle bg-bg-card/50 backdrop-blur-xl p-8 flex flex-col items-center justify-center text-center transition-all duration-500 ease-apple hover:-translate-y-1 hover:shadow-elevated group"
              style={{ animationDelay: "100ms" }}
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-subtle text-accent-primary border border-border-subtle shadow-inner transition-all duration-500 ease-spring group-hover:scale-110">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="mb-1.5 text-lg font-bold text-text-primary tracking-tight">Reflection Locked</h3>
              <p className="text-sm text-text-secondary max-w-sm">
                Your twin needs today&apos;s check-in to generate deep personalized analysis.
              </p>
            </div>
          )}
        </div>

        {/* Right Column (1/3 width) - Insight Stats */}
        <section className="flex flex-col gap-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
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
              tone={getTrendTone(insight.currentTrend)}
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

InsightCards.displayName = "InsightCards";

export default InsightCards;
