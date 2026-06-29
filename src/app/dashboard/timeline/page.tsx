"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Brain,
  Calendar,
  Flag,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Trash2,
  Minus,
  Zap,
  Activity,
  Heart,
  Users,
  Sun,
  Briefcase,
  Plane,
  Trophy,
  AlertTriangle,
  MoreHorizontal,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Button,
  Card,
  Badge,
  Skeleton,
  EmptyState,
  FormField,
  Input,
  Textarea,
  useToast,
} from "@/components/ui";
import {
  getClientCache,
  makeUserScopedCacheKey,
  setClientCache,
} from "@/lib/client-cache";

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

interface LifeEvent {
  _id: string;
  title: string;
  category: string;
  notes: string;
  date: string;
  dayKey: string;
}

interface TimelineInsightsCache {
  insights: PatternInsight[];
  generatedAt?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TIMELINE_DAYS = 90;
const TIMELINE_DAYS_CACHE_TTL_MS = 5 * 60 * 1000;
const TIMELINE_INSIGHTS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  energy: "var(--color-status-warning)",
  focus: "var(--color-accent-primary)",
  stressControl: "var(--color-status-success)",
  socialConnection: "var(--color-status-info)",
  optimism: "var(--color-accent-glow)",
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
  if (percentage >= 80) return "bg-accent-primary/70 border border-accent-primary/40";
  if (percentage >= 65) return "bg-status-info/50 border border-status-info/40";
  if (percentage >= 50) return "bg-status-success/50 border border-status-success/40";
  if (percentage >= 35) return "bg-status-warning/50 border border-status-warning/40";
  return "bg-status-error/40 border border-status-error/30";
}

function heatmapLabel(percentage: number, hasData: boolean): string {
  if (!hasData) return "No check-in";
  if (percentage >= 80) return "Excellent";
  if (percentage >= 65) return "Good";
  if (percentage >= 50) return "Moderate";
  if (percentage >= 35) return "Low";
  return "Critical";
}

const CATEGORY_META: Record<
  string,
  { icon: React.ReactNode; classes: string }
> = {
  career: {
    icon: <Briefcase className="h-3.5 w-3.5" />,
    classes: "text-status-info bg-status-info/10 border-status-info/20",
  },
  health: {
    icon: <Heart className="h-3.5 w-3.5" />,
    classes: "text-status-success bg-status-success/10 border-status-success/20",
  },
  relationship: {
    icon: <Users className="h-3.5 w-3.5" />,
    classes: "text-status-error bg-status-error/10 border-status-error/20",
  },
  personal: {
    icon: <User className="h-3.5 w-3.5" />,
    classes: "text-accent-primary bg-accent-primary/10 border-accent-primary/20",
  },
  travel: {
    icon: <Plane className="h-3.5 w-3.5" />,
    classes: "text-status-info bg-status-info/10 border-status-info/20",
  },
  achievement: {
    icon: <Trophy className="h-3.5 w-3.5" />,
    classes: "text-status-warning bg-status-warning/10 border-status-warning/20",
  },
  challenge: {
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    classes: "text-status-warning bg-status-warning/10 border-status-warning/20",
  },
  other: {
    icon: <MoreHorizontal className="h-3.5 w-3.5" />,
    classes: "text-text-muted bg-bg-panel border-border",
  },
};

function insightTypeMeta(type: PatternInsight["type"]) {
  switch (type) {
    case "strength":
      return {
        bar: "bg-status-success",
        badgeTone: "success" as const,
        icon: <Heart className="h-4 w-4 text-status-success" />,
      };
    case "opportunity":
      return {
        bar: "bg-accent-primary",
        badgeTone: "accent" as const,
        icon: <Sparkles className="h-4 w-4 text-accent-primary" />,
      };
    case "warning":
      return {
        bar: "bg-status-warning",
        badgeTone: "warning" as const,
        icon: <Activity className="h-4 w-4 text-status-warning" />,
      };
    default:
      return {
        bar: "bg-text-muted",
        badgeTone: "default" as const,
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

function getTimelineDaysCacheKey(): string {
  return makeUserScopedCacheKey("timeline-days", String(TIMELINE_DAYS));
}

function getTimelineInsightsCacheKey(): string {
  return makeUserScopedCacheKey("timeline-insights", "latest");
}

function getCachedTimelineDays(): TimelineDay[] | null {
  return getClientCache<TimelineDay[]>(getTimelineDaysCacheKey());
}

function getCachedTimelineInsights(): TimelineInsightsCache | null {
  return getClientCache<TimelineInsightsCache>(getTimelineInsightsCacheKey());
}

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
    <div className="rounded-xl border border-border bg-bg-card px-3 py-2.5 shadow-elevated text-xs">
      <p className="mb-1.5 font-semibold text-text-secondary">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-1.5 py-0.5">
          <span
            className="h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-text-muted capitalize">{p.name}:</span>
          <span className="font-medium text-text-primary">{p.value}/5</span>
        </div>
      ))}
    </div>
  );
}

// ─── Heatmap Cell ─────────────────────────────────────────────────────────────

function HeatCell({ day }: { day: TimelineDay }) {
  const [showTip, setShowTip] = useState(false);
  const colorClass = heatmapColor(day.percentage, day.hasData);

  const formattedDate = parseDay(day.date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="relative">
      <div
        className={`h-5 w-5 rounded-md cursor-pointer transition-all duration-200 ease-apple hover:scale-125 hover:shadow-glow-soft ${colorClass}`}
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
      />
      {showTip && (
        <div className="absolute bottom-full left-1/2 z-50 -translate-x-1/2 mb-1.5 w-max max-w-[180px] rounded-lg border border-border bg-bg-card px-2.5 py-1.5 text-[11px] shadow-elevated pointer-events-none animate-scale-in">
          <p className="font-semibold text-text-primary">{formattedDate}</p>
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
  const { requireAuth, signOut } = useAuth();
  const { toast } = useToast();
  const [initialCachedDays] = useState<TimelineDay[] | null>(() =>
    getCachedTimelineDays(),
  );
  const [initialCachedInsights] = useState<TimelineInsightsCache | null>(() =>
    getCachedTimelineInsights(),
  );
  const [days, setDays] = useState<TimelineDay[]>(() => initialCachedDays ?? []);
  const [insights, setInsights] = useState<PatternInsight[]>(
    () => initialCachedInsights?.insights ?? [],
  );
  const [chartWindow, setChartWindow] = useState<7 | 14 | 30>(30);
  const [loadingDays, setLoadingDays] = useState(() => initialCachedDays === null);
  const [loadingInsights, setLoadingInsights] = useState(
    () => initialCachedInsights === null,
  );
  const [refreshingDays, setRefreshingDays] = useState(false);
  const [refreshingInsights, setRefreshingInsights] = useState(false);
  const [errorDays, setErrorDays] = useState<string | null>(null);
  const [errorInsights, setErrorInsights] = useState<string | null>(null);
  const daysLoadedRef = useRef(initialCachedDays !== null);
  const insightsLoadedRef = useRef(initialCachedInsights !== null);

  // Life events state
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  const [newEventCategory, setNewEventCategory] = useState("personal");
  const [newEventNotes, setNewEventNotes] = useState("");
  const [addingEvent, setAddingEvent] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchDays = useCallback(async ({ forceLoading = false } = {}) => {
    const hasLoadedDays = daysLoadedRef.current;
    setLoadingDays(!hasLoadedDays);
    setRefreshingDays(forceLoading && hasLoadedDays);
    setErrorDays(null);
    try {
      const headers = requireAuth();
      if (!headers) return;
      const res = await fetch("/api/timeline/checkin", {
        headers,
        cache: "no-store",
      });
      if (res.status === 401) {
        signOut();
        return;
      }
      if (!res.ok) throw new Error("Failed to load timeline data");
      const data = await res.json();
      const nextDays = data.days ?? [];
      daysLoadedRef.current = true;
      setDays(nextDays);
      setClientCache(getTimelineDaysCacheKey(), nextDays, TIMELINE_DAYS_CACHE_TTL_MS);
    } catch {
      const msg = "Could not load your wellness timeline.";
      if (!hasLoadedDays) {
        setErrorDays(msg);
      }
      toast({ title: "Error", description: msg, variant: "error" });
    } finally {
      setLoadingDays(false);
      setRefreshingDays(false);
    }
  }, [requireAuth, signOut, toast]);

  const fetchInsights = useCallback(async ({ forceLoading = false } = {}) => {
    const hasLoadedInsights = insightsLoadedRef.current;
    setLoadingInsights(!hasLoadedInsights);
    setRefreshingInsights(forceLoading && hasLoadedInsights);
    setErrorInsights(null);
    try {
      const headers = requireAuth();
      if (!headers) return;
      const res = await fetch("/api/timeline/insights", {
        headers,
        cache: "no-store",
      });
      if (res.status === 401) {
        signOut();
        return;
      }
      if (!res.ok) throw new Error("Failed to load insights");
      const data = await res.json();
      const nextInsights = data.insights ?? [];
      insightsLoadedRef.current = true;
      setInsights(nextInsights);
      setClientCache(
        getTimelineInsightsCacheKey(),
        { insights: nextInsights, generatedAt: data.generatedAt },
        TIMELINE_INSIGHTS_CACHE_TTL_MS,
      );
    } catch {
      const msg = "Could not load pattern insights.";
      if (!hasLoadedInsights) {
        setErrorInsights(msg);
      }
      toast({ title: "Error", description: msg, variant: "error" });
    } finally {
      setLoadingInsights(false);
      setRefreshingInsights(false);
    }
  }, [requireAuth, signOut, toast]);

  const fetchLifeEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const headers = requireAuth();
      if (!headers) return;
      const res = await fetch("/api/life-events?limit=50", { headers, cache: "no-store" });
      if (res.status === 401) {
        signOut();
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as { events: LifeEvent[] };
        setLifeEvents(data.events ?? []);
      }
    } catch {
      toast({ title: "Error", description: "Could not load life events.", variant: "error" });
    } finally {
      setLoadingEvents(false);
    }
  }, [requireAuth, signOut, toast]);

  const handleAddEvent = async () => {
    if (!newEventTitle.trim()) return;
    const headers = requireAuth();
    if (!headers) return;
    setAddingEvent(true);
    try {
      const res = await fetch("/api/life-events", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newEventTitle,
          category: newEventCategory,
          notes: newEventNotes,
          date: newEventDate || new Date().toISOString(),
        }),
      });
      if (res.ok) {
        setNewEventTitle("");
        setNewEventDate("");
        setNewEventCategory("personal");
        setNewEventNotes("");
        setShowAddForm(false);
        void fetchLifeEvents();
      } else {
        toast({ title: "Error", description: "Failed to save event.", variant: "error" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save event.", variant: "error" });
    } finally {
      setAddingEvent(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const headers = requireAuth();
    if (!headers) return;
    try {
      const res = await fetch(`/api/life-events/${id}`, { method: "DELETE", headers });
      if (res.ok) {
        setLifeEvents((ev) => ev.filter((e) => e._id !== id));
      } else {
        toast({ title: "Error", description: "Failed to delete event.", variant: "error" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete event.", variant: "error" });
    }
  };

  useEffect(() => {
    void fetchDays();
    void fetchInsights();
    void fetchLifeEvents();
  }, [fetchDays, fetchInsights, fetchLifeEvents]);

  // Partition TIMELINE_DAYS days into columns (weeks), Sunday-first
  const grid: (TimelineDay | null)[][] = [];
  if (days.length === TIMELINE_DAYS) {
    const firstDow = parseDay(days[0].date).getDay(); // 0=Sun
    const padded: (TimelineDay | null)[] = [
      ...new Array(firstDow).fill(null),
      ...days,
    ];
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
  const isRefreshing = refreshingDays || refreshingInsights;

  return (
    <main className="mx-auto max-w-6xl animate-fade-in space-y-6 pb-10">
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-bold text-text-primary">
            <Calendar className="h-6 w-6 text-accent-primary" />
            Timeline
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            A living visual portrait of your digital self — 90 days at a glance
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          className="w-full sm:w-auto"
          onClick={() => {
            void fetchDays({ forceLoading: true });
            void fetchInsights({ forceLoading: true });
          }}
          loading={isLoading || isRefreshing}
        >
          Refresh
        </Button>
      </div>

      {/* ── Summary Bar ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
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
            tone: trendDir === "improving" ? "success" : trendDir === "declining" ? "error" : "muted",
          },
        ].map(({ label, value, sub, tone }) => (
          <Card key={label} variant="elevated" className="p-4">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
              {label}
            </p>
            <div className={`mt-1 text-xl font-bold ${tone === "success" ? "text-status-success" : tone === "error" ? "text-status-error" : "text-text-primary"}`}>
              {loadingDays ? <Skeleton width={80} height={24} rounded="md" /> : value}
            </div>
            <p className="mt-0.5 text-xs text-text-muted">{sub}</p>
          </Card>
        ))}
      </div>

      {/* ── Calendar Heatmap ────────────────────────────────── */}
      <section className="mb-6">
        <Card variant="default" className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent-primary" />
              {TIMELINE_DAYS}-Day Wellness Calendar
            </h2>
            {/* Legend */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <span>Less</span>
              {[
                "bg-bg-panel border border-border/30",
                "bg-status-error/40 border border-status-error/30",
                "bg-status-warning/50 border border-status-warning/40",
                "bg-status-success/50 border border-status-success/40",
                "bg-accent-primary/70 border border-accent-primary/40",
              ].map((cls, i) => (
                <div key={i} className={`h-3.5 w-3.5 rounded-sm ${cls}`} />
              ))}
              <span>More</span>
            </div>
          </div>

          {loadingDays ? (
            <div className="flex items-center justify-center h-32">
              <Skeleton width="100%" height={96} rounded="lg" />
            </div>
          ) : errorDays ? (
            <EmptyState
              icon={<Calendar className="h-8 w-8" />}
              title="Could not load timeline"
              description={errorDays}
            />
          ) : (
            <div className="flex gap-1 overflow-x-auto scrollbar-hide">
              {/* Day-of-week labels */}
              <div className="flex flex-col gap-1 pr-1">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                  <div
                    key={i}
                    className="h-5 w-5 flex items-center justify-center text-[9px] text-text-muted font-medium"
                  >
                    {d}
                  </div>
                ))}
              </div>
              {/* Weeks */}
              <div className="flex gap-1">
                {grid.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1">
                    {week.map((day, di) =>
                      day ? (
                        <HeatCell key={day.date} day={day} />
                      ) : (
                        <div key={`empty-${wi}-${di}`} className="h-5 w-5" />
                      )
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </section>

      {/* ── Dimension Trend Chart ───────────────────────────── */}
      <section className="mb-6">
        <Card variant="default" className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent-primary" />
              Wellness Dimensions Over Time
            </h2>
            <div className="flex gap-1.5">
              {([7, 14, 30] as const).map((w) => (
                <Button
                  key={w}
                  size="sm"
                  variant={chartWindow === w ? "primary" : "secondary"}
                  onClick={() => setChartWindow(w)}
                >
                  {w}d
                </Button>
              ))}
            </div>
          </div>

          {loadingDays ? (
            <div className="flex items-center justify-center h-48">
              <Skeleton width="100%" height={192} rounded="lg" />
            </div>
          ) : chartData.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-8 w-8" />}
              title="No check-in data yet"
              description="Start your first check-in to see trends."
            />
          ) : (
            <div className="h-64 overflow-hidden sm:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 4, right: 4, left: -30, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--color-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    tick={{ fill: "var(--color-text-muted)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip content={<ChartTooltip />} />
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
        </Card>
      </section>

      {/* ── AI Pattern Insights ─────────────────────────────── */}
      <section className="mb-6">
        <Card variant="default" className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-primary" />
              AI Pattern Insights
            </h2>
            {!loadingInsights && (
              <span className="text-[11px] text-text-muted">
                Powered by DeepSeek · based on your last 30 days
              </span>
            )}
          </div>

          {loadingInsights ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} width="100%" height={120} rounded="xl" />
              ))}
            </div>
          ) : errorInsights ? (
            <EmptyState
              icon={<Sparkles className="h-8 w-8" />}
              title="Insights unavailable"
              description={errorInsights}
            />
          ) : insights.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="h-8 w-8" />}
              title="No insights yet"
              description="Complete more check-ins to unlock AI pattern insights."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {insights.map((insight, idx) => {
                const meta = insightTypeMeta(insight.type);
                return (
                  <Card
                    key={insight.id}
                    variant="interactive"
                    className="relative overflow-hidden p-4"
                    style={{ animationDelay: `${idx * 80}ms` }}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${meta.bar}`} />
                    <div className="flex items-center justify-between mb-2">
                      {meta.icon}
                      <Badge tone={meta.badgeTone}>{insight.type}</Badge>
                    </div>
                    <h3 className="text-sm font-semibold text-text-primary mb-1">
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
                  </Card>
                );
              })}
            </div>
          )}

          {/* Trend summary footer */}
          {!loadingDays && !errorDays && daysWithData.length >= 2 && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-border/40 bg-bg-panel/40 px-3 py-2.5 text-xs leading-relaxed text-text-muted">
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
        </Card>
      </section>

      {/* ── Life Events Section ──────────────────────────────── */}
      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-text-primary">
            <Flag className="h-5 w-5 text-status-error" />
            Life Events
          </h2>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setShowAddForm((v) => !v)}
          >
            Add Event
          </Button>
        </div>

        {/* Add event form */}
        {showAddForm && (
          <Card variant="default" className="mb-4 p-4 animate-fade-in">
            <div className="space-y-3">
              <FormField>
                <Input
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="Event title (e.g. Started new job)"
                  maxLength={200}
                />
              </FormField>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField>
                  <select
                    value={newEventCategory}
                    onChange={(e) => setNewEventCategory(e.target.value)}
                    className="w-full bg-bg-input border border-border text-text-primary rounded-xl px-4 py-2.5 text-sm transition-all duration-200 ease-apple focus:outline-none focus:ring-2 focus:border-accent-primary focus:ring-accent-subtle"
                  >
                    {["career", "health", "relationship", "personal", "travel", "achievement", "challenge", "other"].map((c) => (
                      <option key={c} value={c} className="capitalize">
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField>
                  <Input
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                  />
                </FormField>
              </div>
              <FormField>
                <Textarea
                  value={newEventNotes}
                  onChange={(e) => setNewEventNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  rows={2}
                  maxLength={1000}
                  resize="none"
                />
              </FormField>
              <Button
                fullWidth
                onClick={() => void handleAddEvent()}
                loading={addingEvent}
                disabled={!newEventTitle.trim()}
              >
                Save Event
              </Button>
            </div>
          </Card>
        )}

        {/* Events list */}
        {loadingEvents ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} width="100%" height={56} rounded="xl" />
            ))}
          </div>
        ) : lifeEvents.length === 0 ? (
          <EmptyState
            icon={<Flag className="h-8 w-8" />}
            title="No life events yet"
            description="Add milestones to see how they affect your wellness."
          />
        ) : (
          <div className="space-y-2">
            {lifeEvents.map((event) => {
              const meta = CATEGORY_META[event.category] ?? CATEGORY_META.other;
              return (
                <Card
                  key={event._id}
                  variant="default"
                  className="flex flex-col gap-3 px-4 py-3 min-[430px]:flex-row min-[430px]:items-start"
                >
                  <span
                    className={`mt-0.5 inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${meta.classes}`}
                  >
                    {meta.icon}
                    {event.category}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="break-words text-sm font-semibold text-text-primary [overflow-wrap:anywhere]">
                      {event.title}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      {new Date(event.date).toLocaleDateString()}
                    </p>
                    {event.notes && (
                      <p className="mt-0.5 line-clamp-2 break-words text-xs text-text-secondary [overflow-wrap:anywhere]">
                        {event.notes}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-text-muted hover:text-status-error"
                    onClick={() => void handleDeleteEvent(event._id)}
                    aria-label="Delete event"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
