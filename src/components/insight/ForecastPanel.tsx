"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp, Minus, CalendarDays } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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
  if (trend === "improving") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (trend === "declining") return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-amber-400" />;
}

function ConfidenceDot({ confidence }: { confidence: string }) {
  const colors: Record<string, string> = {
    high: "bg-emerald-400",
    medium: "bg-amber-400",
    low: "bg-zinc-500",
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

  useEffect(() => { void fetchForecast(); }, [fetchForecast]);

  if (loading) {
    return (
      <div className="animate-pulse rounded-2xl border border-border bg-bg-panel p-6">
        <div className="mb-3 h-4 w-40 rounded bg-border" />
        <div className="grid grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-border" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !forecast) {
    return (
      <div className="rounded-xl border border-status-error/20 bg-status-error/10 px-4 py-3 text-sm text-status-error">
        {error ?? "Forecast unavailable."}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-bg-panel p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">7-Day Wellness Forecast</h2>
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
              ? "bg-emerald-500"
              : pct >= 45
              ? "bg-amber-400"
              : "bg-red-500";

          return (
            <div key={day.dayKey} className="flex flex-col items-center gap-1.5 group relative">
              {/* Tooltip on hover */}
              {day.tip && (
                <div className="absolute -top-14 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 w-48 rounded-lg border border-white/10 bg-bg-card px-3 py-2 text-[10px] text-text-secondary shadow-xl">
                  {day.tip}
                </div>
              )}

              {/* Warning badge */}
              <div className="h-4 flex items-center">
                {day.warning ? (
                  <AlertTriangle className="h-3 w-3 text-amber-400" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 text-zinc-700" />
                )}
              </div>

              {/* Bar */}
              <div className="relative w-full rounded-lg bg-white/5 overflow-hidden" style={{ height: 64 }}>
                <div
                  className={`absolute bottom-0 w-full rounded-lg transition-all duration-700 ${barColor}`}
                  style={{ height: `${pct}%` }}
                />
              </div>

              <span className="text-[11px] font-semibold text-white">{pct}%</span>
              <span className="text-[10px] text-text-muted">{day.dayLabel}</span>
              <ConfidenceDot confidence={day.confidence} />
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[10px] text-text-muted">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> ≥65% Good</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> 45–64% Watch</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> &lt;45% Risk</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> High confidence</span>
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Medium</span>
      </div>
    </div>
  );
}
