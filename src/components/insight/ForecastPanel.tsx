"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton, EmptyState } from "@/components/ui";

interface ForecastDay {
  dayKey: string;
  dayLabel: string;
  predictedPercentage: number;
  confidence: "high" | "medium" | "low";
  warning: boolean;
  tip: string | null;
}

interface WellnessForecast {
  days: ForecastDay[];
  trend: "improving" | "stable" | "declining";
  riskDays: number;
  narrative: string;
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "improving") return <TrendingUp className="h-4 w-4 text-status-success" />;
  if (trend === "declining") return <TrendingDown className="h-4 w-4 text-status-error" />;
  return <Minus className="h-4 w-4 text-status-warning" />;
}

function ConfidenceDot({ confidence }: { confidence: string }) {
  const colors: Record<string, string> = {
    high: "bg-status-success",
    medium: "bg-status-warning",
    low: "bg-text-muted",
  };
  return (
    <span
      className={`inline-block h-1.5 w-1.5 rounded-full ${colors[confidence] ?? colors.low}`}
      title={`${confidence} confidence`}
    />
  );
}

export default function ForecastPanel() {
  const { requireAuth } = useAuth();
  const [forecast, setForecast] = useState<WellnessForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchForecast = useCallback(async () => {
    const headers = requireAuth();
    if (!headers) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analytics/forecast", { headers, cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json() as { success: boolean; forecast: WellnessForecast };
      if (data.success) setForecast(data.forecast);
      else setError("Unable to load forecast.");
    } catch {
      setError("Could not load wellness forecast.");
    } finally {
      setLoading(false);
    }
  }, [requireAuth]);

  useEffect(() => {
    void fetchForecast();
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, [fetchForecast]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-bg-panel p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Skeleton width={36} height={36} rounded="xl" />
            <div className="space-y-1.5">
              <Skeleton width={140} height={16} rounded="md" />
              <Skeleton width={100} height={12} rounded="md" />
            </div>
          </div>
          <Skeleton width={80} height={20} rounded="md" />
        </div>
        <Skeleton width="100%" height={14} rounded="md" />
        <div className="grid grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Skeleton width={12} height={12} rounded="full" />
              <Skeleton width="100%" height={64} rounded="lg" />
              <Skeleton width={24} height={14} rounded="md" />
              <Skeleton width={20} height={10} rounded="md" />
              <Skeleton width={6} height={6} rounded="full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-6 w-6 text-text-muted" />}
        title="Forecast unavailable"
        description={error ?? "Unable to load your wellness forecast."}
        action={{
          label: "Retry",
          onClick: () => void fetchForecast(),
        }}
      />
    );
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-panel p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-status-info/10 border border-status-info/20 text-status-info">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">7-Day Wellness Forecast</h2>
            <p className="text-[11px] text-text-muted">Predicted from your patterns</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-text-secondary">
          <TrendIcon trend={forecast.trend} />
          <span className="capitalize">{forecast.trend}</span>
        </div>
      </div>

      {/* Narrative */}
      <p className="text-xs text-text-secondary leading-relaxed">{forecast.narrative}</p>

      {/* Day bars */}
      <div className="grid grid-cols-7 gap-1.5">
        {forecast.days.map((day) => {
          const pct = day.predictedPercentage;
          const barColor =
            pct >= 65
              ? "bg-status-success"
              : pct >= 45
              ? "bg-status-warning"
              : "bg-status-error";

          return (
            <div key={day.dayKey} className="flex flex-col items-center gap-1.5 group relative">
              {/* Tooltip on hover */}
              {day.tip && (
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 w-48 rounded-lg border border-border bg-bg-card px-3 py-2 text-[10px] text-text-secondary shadow-elevated">
                  {day.tip}
                </div>
              )}

              {/* Warning badge */}
              <div className="h-4 flex items-center">
                {day.warning ? (
                  <AlertTriangle className="h-3 w-3 text-status-warning" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 text-text-muted" />
                )}
              </div>

              {/* Bar */}
              <div className="relative w-full rounded-lg bg-bg-hover overflow-hidden" style={{ height: 64 }}>
                <div
                  className={[
                    "absolute bottom-0 w-full rounded-lg transition-all duration-1000 ease-spring",
                    barColor,
                  ].join(" ")}
                  style={{ height: mounted ? `${pct}%` : "0%" }}
                />
              </div>

              <span className="text-[11px] font-semibold text-text-primary">{pct}%</span>
              <span className="text-[10px] text-text-muted">{day.dayLabel}</span>
              <ConfidenceDot confidence={day.confidence} />
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] text-text-muted">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-status-success" /> ≥65% Good</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-status-warning" /> 45–64% Watch</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-status-error" /> &lt;45% Risk</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-status-success" /> High confidence</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-status-warning" /> Medium</span>
      </div>
    </div>
  );
}
