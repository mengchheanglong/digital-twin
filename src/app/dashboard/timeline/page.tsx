"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Brain,
  Calendar,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  Zap,
  Activity,
  Heart,
  Users,
  Sun,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TimelineDay {
  date: string;
  dayKey: string;
  percentage: number;
  overallScore: number;
  ratings: number[];
  hasData: boolean;
}

interface PatternInsight {
  id: string;
  title: string;
  description: string;
  type: "strength" | "opportunity" | "pattern" | "warning";
  dimension?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TIMELINE_DAYS = 90;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse a YYYY-MM-DD date string at noon local time to avoid TZ edge cases. */
function parseDay(dateStr: string): Date {
  return new Date(dateStr + "T12:00:00");
}

const DIMENSION_KEYS = [
  "energy",
  "focus",
  "stressControl",
  "socialConnection",
  "optimism",
] as const;

const DIMENSION_LABELS: Record<(typeof DIMENSION_KEYS)[number], string> = {
  energy: "Energy",
  focus: "Focus",
  stressControl: "Stress",
  socialConnection: "Social",
  optimism: "Optimism",
};

const DIMENSION_COLORS: Record<(typeof DIMENSION_KEYS)[number], string> = {
  energy: "#FBBF24",
  focus: "#8B5CF6",
  stressControl: "#34D399",
  socialConnection: "#60A5FA",
  optimism: "#F472B6",
};

const DIMENSION_ICONS: Record<(typeof DIMENSION_KEYS)[number], React.ReactNode> = {
  energy: <Zap className="h-3.5 w-3.5" />,
  focus: <Brain className="h-3.5 w-3.5" />,
  stressControl: <Activity className="h-3.5 w-3.5" />,
  socialConnection: <Users className="h-3.5 w-3.5" />,
  optimism: <Sun className="h-3.5 w-3.5" />,
};

function heatmapColor(percentage: number, hasData: boolean): string {
  if (!hasData) return "bg-bg-panel border border-border/30";
  if (percentage >= 80) return "bg-violet-600/90 border border-violet-500/50";
  if (percentage >= 65) return "bg-violet-500/60 border border-violet-400/40";
  if (percentage >= 50) return "bg-amber-500/50 border border-amber-400/40";
  if (percentage >= 35) return "bg-orange-500/50 border border-orange-400/40";
  return "bg-red-500/40 border border-red-400/30";
}

function heatmapLabel(percentage: number, hasData: boolean): string {
  if (!hasData) return "No check-in";
  if (percentage >= 80) return "Excellent";
  if (percentage >= 65) return "Good";
  if (percentage >= 50) return "Moderate";
  if (percentage >= 35) return "Low";
  return "Critical";
}

function insightTypeStyle(type: PatternInsight["type"]): {
  border: string;
  bg: string;
  badge: string;
  icon: React.ReactNode;
} {
  switch (type) {
    case "strength":
      return {
        border: "border-status-success/30",
        bg: "bg-status-success/5",
        badge: "bg-status-success/20 text-status-success",
        icon: <Heart className="h-4 w-4 text-status-success" />,
      };
    case "opportunity":
      return {
        border: "border-accent-primary/30",
        bg: "bg-accent-primary/5",
        badge: "bg-accent-primary/20 text-accent-glow",
        icon: <Sparkles className="h-4 w-4 text-accent-primary" />,
      };
    case "warning":
      return {
        border: "border-status-warning/30",
        bg: "bg-status-warning/5",
        badge: "bg-status-warning/20 text-status-warning",
        icon: <Activity className="h-4 w-4 text-status-warning" />,
      };
    default:
      return {
        border: "border-border",
        bg: "bg-bg-panel/40",
        badge: "bg-bg-panel text-text-secondary",
        icon: <Brain className="h-4 w-4 text-text-secondary" />,
      };
  }
}

// Build chart-ready data from the last N days
function buildChartData(
  days: TimelineDay[],
  windowDays: number
): Array<Record<string, number | string>> {
  const recent = days.filter((d) => d.hasData).slice(-windowDays);
  return recent.map((d) => {
    const r = d.ratings;
    const entry: Record<string, number | string> = {
      date: parseDay(d.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
    };
    DIMENSION_KEYS.forEach((key, idx) => {
      entry[key] = r[idx] ?? 0;
    });
    return entry;
  });
}

// ─── Tooltip component for recharts ─────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-bg-card px-3 py-2.5 shadow-lg text-xs">
      <p className="mb-1.5 font-semibold text-text-secondary">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-1.5 py-0.5">
          <span
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-text-muted capitalize">{p.name}:</span>
          <span className="font-medium text-white">{p.value}/5</span>
        </div>
      ))}
    </div>
  );
}

// ─── Heatmap Cell ─────────────────────────────────────────────────────────────

function HeatCell({ day }: { day: TimelineDay }) {
  const [showTip, setShowTip] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);
  const colorClass = heatmapColor(day.percentage, day.hasData);

  const formattedDate = parseDay(day.date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="relative">
      <div
        className={`h-4 w-4 rounded-sm cursor-pointer transition-transform hover:scale-125 ${colorClass}`}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
      />
      {showTip && (
        <div
          ref={tipRef}
          className="absolute bottom-full left-1/2 z-50 -translate-x-1/2 mb-1.5 w-max max-w-[160px] rounded-lg border border-border bg-bg-card px-2.5 py-1.5 text-[11px] shadow-lg pointer-events-none"
        >
          <p className="font-semibold text-white">{formattedDate}</p>
          {day.hasData ? (
            <>
              <p className="text-text-secondary">
                Score:{" "}
                <span className="font-bold text-accent-glow">{day.percentage}%</span>
              </p>
              <p className="text-text-muted">{heatmapLabel(day.percentage, true)}</p>
            </>
          ) : (
            <p className="text-text-muted">No check-in logged</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TimelinePage() {
  const [days, setDays] = useState<TimelineDay[]>([]);
  const [insights, setInsights] = useState<PatternInsight[]>([]);
  const [chartWindow, setChartWindow] = useState<7 | 14 | 30>(30);
  const [loadingDays, setLoadingDays] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [errorDays, setErrorDays] = useState<string | null>(null);
  const [errorInsights, setErrorInsights] = useState<string | null>(null);

  const fetchDays = useCallback(async () => {
    setLoadingDays(true);
    setErrorDays(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/timeline/checkin", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load timeline data");
      const data = await res.json();
      setDays(data.days ?? []);
    } catch {
      setErrorDays("Could not load your wellness timeline.");
    } finally {
      setLoadingDays(false);
    }
  }, []);

  const fetchInsights = useCallback(async () => {
    setLoadingInsights(true);
    setErrorInsights(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/timeline/insights", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load insights");
      const data = await res.json();
      setInsights(data.insights ?? []);
    } catch {
      setErrorInsights("Could not load pattern insights.");
    } finally {
      setLoadingInsights(false);
    }
  }, []);

  useEffect(() => {
    void fetchDays();
    void fetchInsights();
  }, [fetchDays, fetchInsights]);

  // Partition TIMELINE_DAYS days into columns (weeks), Sunday-first
  const grid: (TimelineDay | null)[][] = [];
  if (days.length === TIMELINE_DAYS) {
    // Find what day of week the first day is
    const firstDow = parseDay(days[0].date).getDay(); // 0=Sun
    // Pad the start with nulls
    const padded: (TimelineDay | null)[] = [
      ...new Array(firstDow).fill(null),
      ...days,
    ];
    // Split into weeks
    for (let i = 0; i < padded.length; i += 7) {
      grid.push(padded.slice(i, i + 7));
    }
  }

  const chartData = buildChartData(days, chartWindow);

  // Summary stats
  const daysWithData = days.filter((d) => d.hasData);
  const avgScore =
    daysWithData.length
      ? Math.round(daysWithData.reduce((a, d) => a + d.percentage, 0) / daysWithData.length)
      : 0;
  const recent7 = daysWithData.slice(-7);
  const older7 = daysWithData.slice(-14, -7);
  const recentAvg = recent7.length
    ? recent7.reduce((a, d) => a + d.percentage, 0) / recent7.length
    : 0;
  const olderAvg = older7.length
    ? older7.reduce((a, d) => a + d.percentage, 0) / older7.length
    : 0;
  const trendDir =
    recentAvg > olderAvg + 4
      ? "improving"
      : recentAvg < olderAvg - 4
        ? "declining"
        : "stable";

  const isLoading = loadingDays || loadingInsights;

  return (
    <main className="min-h-screen bg-bg-base px-6 py-8 max-w-6xl mx-auto">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Calendar className="h-6 w-6 text-accent-primary" />
            Wellness Timeline
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            A living visual portrait of your digital self — 90 days at a glance
          </p>
        </div>
        <button
          onClick={() => {
            void fetchDays();
            void fetchInsights();
          }}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-xl border border-border bg-bg-panel px-4 py-2 text-sm text-text-secondary hover:border-accent-primary/40 hover:text-white transition-all"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      {/* ── Summary Bar ─────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          {
            label: `Check-ins (${TIMELINE_DAYS}d)`,
            value: `${daysWithData.length} days`,
            sub: `${Math.round((daysWithData.length / TIMELINE_DAYS) * 100)}% consistency`,
          },
          {
            label: "Avg Wellness",
            value: `${avgScore}%`,
            sub: "across all logged days",
          },
          {
            label: "7-day Trend",
            value:
              trendDir === "improving" ? "↑ Improving" : trendDir === "declining" ? "↓ Declining" : "→ Stable",
            sub: `${Math.abs(Math.round(recentAvg - olderAvg))}% vs prior week`,
            color:
              trendDir === "improving"
                ? "text-status-success"
                : trendDir === "declining"
                  ? "text-status-error"
                  : "text-text-secondary",
          },
        ].map(({ label, value, sub, color }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-bg-card p-4"
          >
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
              {label}
            </p>
            <p className={`mt-1 text-xl font-bold ${color ?? "text-white"}`}>
              {loadingDays ? <Loader2 className="h-5 w-5 animate-spin text-text-muted" /> : value}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Calendar Heatmap ────────────────────────────────── */}
      <section className="mb-6 rounded-xl border border-border bg-bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-accent-primary" />
            {TIMELINE_DAYS}-Day Wellness Calendar
          </h2>
          {/* Legend */}
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>Less</span>
            {[
              "bg-bg-panel border border-border/30",
              "bg-red-500/40",
              "bg-amber-500/50",
              "bg-violet-500/60",
              "bg-violet-600/90",
            ].map((cls, i) => (
              <div key={i} className={`h-3.5 w-3.5 rounded-sm ${cls}`} />
            ))}
            <span>More</span>
          </div>
        </div>

        {loadingDays ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 className="h-6 w-6 animate-spin text-accent-primary" />
          </div>
        ) : errorDays ? (
          <p className="text-center text-sm text-status-error py-8">{errorDays}</p>
        ) : (
          <>
            {/* Day-of-week labels */}
            <div className="mb-1 ml-0 flex gap-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div
                  key={i}
                  className="h-4 w-4 flex items-center justify-center text-[9px] text-text-muted font-medium"
                >
                  {d}
                </div>
              ))}
            </div>
            {/* Grid: each row is a day of week, each col is a week */}
            <div className="flex gap-1">
              {grid.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day, di) =>
                    day ? (
                      <HeatCell key={day.date} day={day} />
                    ) : (
                      <div key={`empty-${wi}-${di}`} className="h-4 w-4" />
                    )
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── Dimension Trend Chart ───────────────────────────── */}
      <section className="mb-6 rounded-xl border border-border bg-bg-card p-5">
        <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent-primary" />
            Wellness Dimensions Over Time
          </h2>
          <div className="flex gap-1.5">
            {([7, 14, 30] as const).map((w) => (
              <button
                key={w}
                onClick={() => setChartWindow(w)}
                className={[
                  "rounded-lg px-3 py-1 text-xs font-medium transition-all",
                  chartWindow === w
                    ? "bg-accent-primary/20 text-accent-glow border border-accent-primary/40"
                    : "bg-bg-panel text-text-muted border border-border hover:text-white",
                ].join(" ")}
              >
                {w}d
              </button>
            ))}
          </div>
        </div>

        {loadingDays ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-6 w-6 animate-spin text-accent-primary" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-text-muted text-sm gap-2">
            <Calendar className="h-8 w-8 opacity-40" />
            <p>No check-in data yet. Start your first check-in to see trends.</p>
          </div>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(42,46,63,0.8)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#6B7280", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fill: "#6B7280", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  formatter={(value) =>
                    DIMENSION_LABELS[value as keyof typeof DIMENSION_LABELS] ?? value
                  }
                />
                {DIMENSION_KEYS.map((key) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={DIMENSION_COLORS[key]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Dimension legend chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          {DIMENSION_KEYS.map((key) => (
            <div
              key={key}
              className="flex items-center gap-1.5 rounded-full border border-border/60 bg-bg-panel/60 px-2.5 py-1 text-[11px]"
            >
              <span style={{ color: DIMENSION_COLORS[key] }}>
                {DIMENSION_ICONS[key]}
              </span>
              <span className="text-text-secondary">{DIMENSION_LABELS[key]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Pattern Insights ─────────────────────────────── */}
      <section className="rounded-xl border border-border bg-bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-primary" />
            AI Pattern Insights
          </h2>
          {!loadingInsights && (
            <span className="text-[11px] text-text-muted">
              Powered by Gemini · based on your last 30 days
            </span>
          )}
        </div>

        {loadingInsights ? (
          <div className="flex items-center justify-center h-24">
            <div className="flex items-center gap-2 text-text-muted text-sm">
              <Loader2 className="h-5 w-5 animate-spin text-accent-primary" />
              Analysing your patterns…
            </div>
          </div>
        ) : errorInsights ? (
          <p className="text-center text-sm text-status-error py-6">{errorInsights}</p>
        ) : insights.length === 0 ? (
          <p className="text-center text-sm text-text-muted py-6">
            Complete more check-ins to unlock AI pattern insights.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {insights.map((insight) => {
              const style = insightTypeStyle(insight.type);
              return (
                <div
                  key={insight.id}
                  className={`rounded-xl border p-4 transition-all hover:shadow-md ${style.border} ${style.bg}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    {style.icon}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}
                    >
                      {insight.type}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">
                    {insight.title}
                  </h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {insight.description}
                  </p>
                  {insight.dimension && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-bg-panel/80 border border-border/40 px-2 py-0.5 text-[10px] text-text-muted">
                      {insight.dimension}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Trend summary footer */}
        {!loadingDays && !errorDays && daysWithData.length >= 2 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-border/40 bg-bg-panel/40 px-3 py-2.5 text-xs text-text-muted">
            {trendDir === "improving" ? (
              <TrendingUp className="h-4 w-4 text-status-success flex-shrink-0" />
            ) : trendDir === "declining" ? (
              <TrendingDown className="h-4 w-4 text-status-error flex-shrink-0" />
            ) : (
              <Minus className="h-4 w-4 flex-shrink-0" />
            )}
            <span>
              Your 7-day average ({Math.round(recentAvg)}%) is{" "}
              {trendDir === "improving"
                ? `up ${Math.abs(Math.round(recentAvg - olderAvg))}%`
                : trendDir === "declining"
                  ? `down ${Math.abs(Math.round(recentAvg - olderAvg))}%`
                  : "holding steady"}{" "}
              compared to the prior week.
            </span>
          </div>
        )}
      </section>
    </main>
  );
}
