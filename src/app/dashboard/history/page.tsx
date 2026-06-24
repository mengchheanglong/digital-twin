"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Clock, TrendingUp, Star, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { CHECKIN_DIMENSIONS } from "@/lib/progression";
import { Card } from "@/components/ui";
import { ProgressBar } from "@/components/ui";
import { EmptyState } from "@/components/ui";
import { Skeleton } from "@/components/ui";
import { Badge } from "@/components/ui";

interface HistoryItem {
  id: string;
  date: string;
  overallScore: number;
  percentage: number;
  ratings: number[];
}

function HistorySkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5 space-y-4">
            <div className="flex items-start justify-between">
              <Skeleton width={120} height={18} rounded="md" />
              <Skeleton width={50} height={22} rounded="md" />
            </div>
            <Skeleton width="100%" height={6} rounded="full" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} width={60} height={20} rounded="full" />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function getRatingColor(rating: number): string {
  if (rating >= 4)
    return "bg-status-success/15 text-status-success border-status-success/25";
  if (rating === 3)
    return "bg-status-warning/15 text-status-warning border-status-warning/25";
  return "bg-status-error/15 text-status-error border-status-error/25";
}

export default function HistoryPage() {
  const router = useRouter();
  const { requireAuth } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHistory = useCallback(async () => {
    const headers = requireAuth();
    if (!headers) return;

    try {
      setLoading(true);
      const response = await axios.get("/api/checkin/history", { headers });

      const items = Array.isArray(response.data?.history)
        ? (response.data.history as HistoryItem[])
        : [];
      setHistory(items);
      setError("");
    } catch (requestError) {
      if (
        axios.isAxiosError(requestError) &&
        requestError.response?.status === 401
      ) {
        requireAuth();
        return;
      }

      setError("Could not load pulse history.");
    } finally {
      setLoading(false);
    }
  }, [requireAuth]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const summary = useMemo(() => {
    if (!history.length) return null;
    const total = history.length;
    const avgScore =
      history.reduce((sum, item) => sum + item.overallScore, 0) / total;
    const avgPercent =
      history.reduce((sum, item) => sum + item.percentage, 0) / total;
    return {
      total,
      avgScore: Math.round(avgScore * 10) / 10,
      avgPercent: Math.round(avgPercent),
    };
  }, [history]);

  return (
    <div className="mx-auto w-full max-w-4xl animate-fade-in space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-subtle text-accent-primary border border-accent-primary/20 shadow-glow-soft">
          <Clock className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Check-in History
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Your chronological wellness record.
          </p>
        </div>
      </div>

      {/* Summary stats */}
      {summary && (
        <div
          className="grid grid-cols-3 gap-4 animate-fade-in"
          style={{ animationDelay: "100ms" }}
        >
          <Card
            variant="elevated"
            className="group relative overflow-hidden px-5 py-4 flex items-center gap-3"
          >
            <div className="pointer-events-none absolute -top-4 -right-4 h-16 w-16 rounded-full bg-accent-primary/5 blur-xl" />
            <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-subtle text-accent-primary ring-1 ring-accent-primary/20">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="relative z-10">
              <p className="text-xl font-black text-text-primary leading-none">
                {summary.avgPercent}%
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mt-0.5">
                Avg Wellness
              </p>
            </div>
          </Card>

          <Card
            variant="elevated"
            className="group relative overflow-hidden px-5 py-4 flex items-center gap-3"
          >
            <div className="pointer-events-none absolute -top-4 -right-4 h-16 w-16 rounded-full bg-status-success/5 blur-xl" />
            <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-status-success/10 text-status-success ring-1 ring-status-success/20">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="relative z-10">
              <p className="text-xl font-black text-text-primary leading-none">
                {summary.total}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mt-0.5">
                Check-ins
              </p>
            </div>
          </Card>

          <Card
            variant="elevated"
            className="group relative overflow-hidden px-5 py-4 flex items-center gap-3"
          >
            <div className="pointer-events-none absolute -top-4 -right-4 h-16 w-16 rounded-full bg-status-warning/5 blur-xl" />
            <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-status-warning/10 text-status-warning ring-1 ring-status-warning/20">
              <Star className="h-4 w-4" />
            </div>
            <div className="relative z-10">
              <p className="text-xl font-black text-text-primary leading-none">
                {summary.avgScore}/25
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mt-0.5">
                Avg Score
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* History grid */}
      <Card variant="elevated" className="relative overflow-hidden">
        <div className="pointer-events-none absolute top-0 h-1/3 w-full bg-gradient-to-b from-accent-primary/5 to-transparent" />

        <div className="relative z-10 space-y-4 p-6">
          {loading ? (
            <HistorySkeleton />
          ) : error ? (
            <div className="rounded-xl border border-status-error/20 bg-status-error/10 px-4 py-3 text-sm font-medium text-status-error">
              {error}
            </div>
          ) : !history.length ? (
            <EmptyState
              icon={<Clock className="h-8 w-8" />}
              title="No check-ins yet"
              description="Start your first daily check-in to build your history and track your growth over time."
              action={{
                label: "Start Check-in",
                onClick: () => router.push("/dashboard/checkin"),
              }}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {history.map((item, index) => {
                const dateObj = new Date(item.date);
                const dateLabel = dateObj.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year:
                    dateObj.getFullYear() !== new Date().getFullYear()
                      ? "numeric"
                      : undefined,
                });
                const isGood = item.percentage >= 70;
                const isOk = item.percentage >= 45;

                return (
                  <article
                    key={item.id}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-border bg-bg-panel/60 p-5 backdrop-blur-md transition-all duration-500 ease-apple hover:-translate-y-0.5 hover:border-accent-primary/30 hover:bg-bg-panel hover:shadow-elevated"
                    style={{
                      animation: "fadeIn 300ms ease-out forwards",
                      animationDelay: `${Math.min(index * 60, 600)}ms`,
                      opacity: 0,
                    }}
                  >
                    {/* Side accent stripe */}
                    <div
                      className={[
                        "absolute left-0 top-3 bottom-3 w-1 rounded-r-full",
                        isGood
                          ? "bg-status-success"
                          : isOk
                            ? "bg-status-warning"
                            : "bg-status-error",
                      ].join(" ")}
                    />

                    <div className="mb-3 flex items-start justify-between pl-3">
                      <p className="text-sm font-bold tracking-tight text-text-primary transition-colors group-hover:text-accent-primary">
                        {dateLabel}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={[
                            "text-lg font-black",
                            isGood
                              ? "text-status-success"
                              : isOk
                                ? "text-status-warning"
                                : "text-status-error",
                          ].join(" ")}
                        >
                          {item.percentage}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 pl-3">
                      <ProgressBar
                        value={item.percentage}
                        max={100}
                        size="sm"
                        className="opacity-80 group-hover:opacity-100 transition-opacity"
                      />

                      <div className="flex flex-wrap gap-1.5">
                        {item.ratings.map((rating, ri) => {
                          const dimension = CHECKIN_DIMENSIONS[ri] ?? "metric";
                          const label =
                            dimension.charAt(0).toUpperCase() +
                            dimension.slice(1);
                          return (
                            <span
                              key={dimension}
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getRatingColor(rating)}`}
                              title={`${label}: ${rating}`}
                            >
                              {label.substring(0, 3)}: {rating}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
