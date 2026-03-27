"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Calendar,
  ChevronDown,
  ChevronUp,
  Flame,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CorrelationResult {
  dimension: string;
  coefficient: number;
  label: string;
  sampleSize: number;
}

interface CorrelationReport {
  correlations: CorrelationResult[];
  interpretation: string;
  sampleDays: number;
}

interface BurnoutFactor {
  name: string;
  score: number;
  description: string;
}

interface BurnoutReport {
  riskScore: number;
  riskLevel: "low" | "moderate" | "high" | "critical";
  factors: BurnoutFactor[];
  recommendations: string[];
}

interface DayPattern {
  dayOfWeek: number;
  dayName: string;
  averageScore: number;
  sampleCount: number;
}

interface MoodPattern {
  bestDay: DayPattern;
  worstDay: DayPattern;
  allDays: DayPattern[];
  trend: "improving" | "stable" | "declining";
  strongestDimension: string;
  weakestDimension: string;
  dimensionAverages: Record<string, number>;
}

interface StreakDetail {
  name: string;
  current: number;
  best: number;
  unit: string;
}

interface StreakReport {
  streaks: StreakDetail[];
  overallStreak: number;
}

interface WeeklyStats {
  checkInsLogged: number;
  averageWellness: number;
  questsCompleted: number;
  questsTotal: number;
  journalEntriesWritten: number;
  focusSessionsCompleted: number;
  totalFocusMinutes: number;
  mostProductiveDay: string;
  topInterest: string;
  trend: string;
}

interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  stats: WeeklyStats;
  aiSummary: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dimensionLabel(dim: string): string {
  const map: Record<string, string> = {
    energy: "Energy",
    focus: "Focus",
    stressControl: "Stress Control",
    socialConnection: "Social",
    optimism: "Optimism",
  };
  return map[dim] ?? dim;
}

function burnoutColor(level: string): string {
  if (level === "critical") return "text-red-400";
  if (level === "high") return "text-orange-400";
  if (level === "moderate") return "text-yellow-400";
  return "text-green-400";
}

function burnoutBg(level: string): string {
  if (level === "critical") return "bg-red-500/10 border-red-500/20";
  if (level === "high") return "bg-orange-500/10 border-orange-500/20";
  if (level === "moderate")
    return "bg-yellow-500/10 border-yellow-500/20";
  return "bg-green-500/10 border-green-500/20";
}

function trendIcon(trend: string) {
  if (trend === "improving")
    return <TrendingUp className="h-4 w-4 text-green-400" />;
  if (trend === "declining")
    return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Activity className="h-4 w-4 text-text-muted" />;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
        {icon}
      </div>
      <div>
        <h2 className="text-base font-bold text-white">{title}</h2>
        <p className="text-xs text-text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="flex h-40 items-center justify-center rounded-2xl border border-border bg-bg-card">
      <Loader2 className="h-5 w-5 animate-spin text-accent-primary" />
    </div>
  );
}

// ─── Correlation Card ─────────────────────────────────────────────────────────

function CorrelationCard({
  report,
  loading,
}: {
  report: CorrelationReport | null;
  loading: boolean;
}) {
  if (loading) return <LoadingCard />;

  return (
    <div className="group relative rounded-2xl border border-white/5 bg-bg-card/80 backdrop-blur-xl p-6 shadow-card transition-all duration-500 ease-apple hover:-translate-y-1 hover:shadow-stripe-hover overflow-hidden">
      {/* Ambient hover glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent-primary/20 blur-[60px] opacity-0 transition-opacity duration-700 ease-apple group-hover:opacity-50" />
      <SectionHeader
        icon={<BarChart3 className="h-5 w-5" />}
        title="Check-in × Quest Correlation"
        subtitle={
          report
            ? `Based on ${report.sampleDays} overlapping days`
            : "Pearson correlation analysis"
        }
      />

      {!report || report.sampleDays < 3 ? (
        <p className="text-sm text-text-muted">
          Keep logging check-ins and completing quests — correlation
          analysis needs at least 3 days of data.
        </p>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {report.correlations.map((c) => {
              const pct = Math.round(
                ((c.coefficient + 1) / 2) * 100,
              );
              const isPositive = c.coefficient >= 0;
              return (
                <div key={c.dimension}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-text-secondary">
                      {dimensionLabel(c.dimension)}
                    </span>
                    <span
                      className={`text-xs font-bold ${isPositive ? "text-green-400" : "text-red-400"}`}
                    >
                      r = {c.coefficient > 0 ? "+" : ""}
                      {c.coefficient}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-bg-base rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isPositive ? "bg-accent-primary" : "bg-orange-500"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-text-secondary italic">
            {report.interpretation}
          </p>
        </>
      )}
    </div>
  );
}

// ─── Burnout Card ─────────────────────────────────────────────────────────────

function BurnoutCard({
  report,
  loading,
}: {
  report: BurnoutReport | null;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  if (loading) return <LoadingCard />;

  if (!report)
    return (
      <div className="group relative rounded-2xl border border-white/5 bg-bg-card/80 backdrop-blur-xl p-6 shadow-card transition-all duration-500 ease-apple hover:-translate-y-1 hover:shadow-stripe-hover overflow-hidden">
      {/* Ambient hover glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent-primary/20 blur-[60px] opacity-0 transition-opacity duration-700 ease-apple group-hover:opacity-50" />
        <p className="text-sm text-text-muted">
          Could not load burnout data.
        </p>
      </div>
    );

  return (
    <div
      className={`group relative rounded-2xl border backdrop-blur-xl p-6 shadow-card transition-all duration-500 ease-apple hover:-translate-y-1 hover:shadow-stripe-hover overflow-hidden ${burnoutBg(report.riskLevel)}`}
    >
      {/* Ambient hover aura specific to burnout risk */}
      <div className={`pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-[60px] opacity-0 transition-opacity duration-700 ease-apple group-hover:opacity-40 ${burnoutBg(report.riskLevel).split(' ')[0]}`} />
      <SectionHeader
        icon={<AlertTriangle className="h-5 w-5" />}
        title="Burnout Risk"
        subtitle="Based on 7-day wellness trend"
      />

      <div className="flex items-center gap-4 mb-4">
        <div className="relative h-20 w-20 flex-shrink-0">
          <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="text-bg-base"
            />
            <circle
              cx="18"
              cy="18"
              r="15.9"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeDasharray={`${report.riskScore} ${100 - report.riskScore}`}
              strokeLinecap="round"
              className={burnoutColor(report.riskLevel)}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className={`text-lg font-bold ${burnoutColor(report.riskLevel)}`}
            >
              {report.riskScore}
            </span>
          </div>
        </div>

        <div>
          <p className="text-lg font-bold text-white capitalize">
            {report.riskLevel} Risk
          </p>
          <p className="text-xs text-text-secondary">
            {report.recommendations[0]}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs text-text-muted hover:text-white transition-colors"
      >
        {expanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        {expanded ? "Hide details" : "View factors"}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {report.factors.map((f) => (
            <div key={f.name} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex justify-between mb-0.5">
                  <span className="text-xs text-text-secondary">
                    {f.name}
                  </span>
                  <span className="text-xs text-text-muted">
                    {f.description}
                  </span>
                </div>
                <div className="h-1 w-full bg-bg-base rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${f.score}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mood Patterns Card ───────────────────────────────────────────────────────

function MoodPatternsCard({
  patterns,
  loading,
}: {
  patterns: MoodPattern | null;
  loading: boolean;
}) {
  if (loading) return <LoadingCard />;

  if (!patterns)
    return (
      <div className="group relative rounded-2xl border border-white/5 bg-bg-card/80 backdrop-blur-xl p-6 shadow-card transition-all duration-500 ease-apple hover:-translate-y-1 hover:shadow-stripe-hover overflow-hidden">
      {/* Ambient hover glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent-primary/20 blur-[60px] opacity-0 transition-opacity duration-700 ease-apple group-hover:opacity-50" />
        <p className="text-sm text-text-muted">
          Could not load mood patterns.
        </p>
      </div>
    );

  const maxScore = Math.max(
    ...patterns.allDays
      .filter((d) => d.sampleCount > 0)
      .map((d) => d.averageScore),
    1,
  );

  return (
    <div className="group relative rounded-2xl border border-white/5 bg-bg-card/80 backdrop-blur-xl p-6 shadow-card transition-all duration-500 ease-apple hover:-translate-y-1 hover:shadow-stripe-hover overflow-hidden">
      {/* Ambient hover glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent-primary/20 blur-[60px] opacity-0 transition-opacity duration-700 ease-apple group-hover:opacity-50" />
      <SectionHeader
        icon={<Brain className="h-5 w-5" />}
        title="Mood Patterns"
        subtitle="Day-of-week wellness distribution"
      />

      <div className="flex items-end gap-1.5 h-24 mb-4">
        {patterns.allDays.map((day) => {
          const height =
            day.sampleCount > 0
              ? Math.max(8, (day.averageScore / maxScore) * 80)
              : 6;
          const isBest =
            day.dayOfWeek === patterns.bestDay.dayOfWeek;
          return (
            <div
              key={day.dayOfWeek}
              className="flex flex-col items-center flex-1 gap-1"
            >
              <div
                className={`w-full rounded-t-sm transition-all duration-500 ${
                  isBest
                    ? "bg-accent-primary"
                    : "bg-bg-panel"
                }`}
                style={{ height: `${height}px` }}
              />
              <span className="text-[9px] text-text-muted">
                {day.dayName.slice(0, 2)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-xl bg-green-500/10 border border-green-500/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-text-muted mb-0.5">
            Best Day
          </p>
          <p className="text-sm font-bold text-green-400">
            {patterns.bestDay.dayName}
          </p>
          <p className="text-xs text-text-secondary">
            avg {patterns.bestDay.averageScore}%
          </p>
        </div>
        <div className="rounded-xl bg-bg-panel border border-border px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-text-muted mb-0.5">
            Strongest
          </p>
          <p className="text-sm font-bold text-accent-primary">
            {dimensionLabel(patterns.strongestDimension)}
          </p>
          <p className="text-xs text-text-secondary">
            avg{" "}
            {patterns.dimensionAverages[
              patterns.strongestDimension
            ]?.toFixed(1)}
            /5
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {trendIcon(patterns.trend)}
        <span className="text-xs text-text-secondary capitalize">
          {patterns.trend === "improving"
            ? "Improving over the period"
            : patterns.trend === "declining"
              ? "Declining — needs attention"
              : "Stable pattern"}
        </span>
      </div>
    </div>
  );
}

// ─── Streaks Card ─────────────────────────────────────────────────────────────

function StreaksCard({
  report,
  loading,
}: {
  report: StreakReport | null;
  loading: boolean;
}) {
  if (loading) return <LoadingCard />;

  if (!report)
    return (
      <div className="group relative rounded-2xl border border-white/5 bg-bg-card/80 backdrop-blur-xl p-6 shadow-card transition-all duration-500 ease-apple hover:-translate-y-1 hover:shadow-stripe-hover overflow-hidden">
      {/* Ambient hover glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent-primary/20 blur-[60px] opacity-0 transition-opacity duration-700 ease-apple group-hover:opacity-50" />
        <p className="text-sm text-text-muted">
          Could not load streak data.
        </p>
      </div>
    );

  return (
    <div className="group relative rounded-2xl border border-white/5 bg-bg-card/80 backdrop-blur-xl p-6 shadow-card transition-all duration-500 ease-apple hover:-translate-y-1 hover:shadow-stripe-hover overflow-hidden">
      {/* Ambient hover glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent-primary/20 blur-[60px] opacity-0 transition-opacity duration-700 ease-apple group-hover:opacity-50" />
      <SectionHeader
        icon={<Flame className="h-5 w-5" />}
        title="Activity Streaks"
        subtitle="Per-activity consecutive day streaks"
      />

      <div className="grid grid-cols-2 gap-3">
        {report.streaks.map((streak) => (
          <div
            key={streak.name}
            className="rounded-xl bg-bg-panel border border-border px-3 py-3"
          >
            <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">
              {streak.name}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-white">
                {streak.current}
              </span>
              <span className="text-xs text-text-muted">
                {streak.unit}
              </span>
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">
              Best: {streak.best}d
            </p>
          </div>
        ))}
      </div>

      {report.overallStreak > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-orange-500/10 border border-orange-500/20 px-3 py-2">
          <Flame className="h-4 w-4 text-orange-400" />
          <span className="text-sm text-orange-400 font-semibold">
            {report.overallStreak} day overall streak
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Weekly Report Card ───────────────────────────────────────────────────────

function WeeklyReportCard({
  report,
  loading,
  onRefresh,
}: {
  report: WeeklyReport | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  if (loading) return <LoadingCard />;

  if (!report)
    return (
      <div className="group relative rounded-2xl border border-white/5 bg-bg-card/80 backdrop-blur-xl p-6 shadow-card transition-all duration-500 ease-apple hover:-translate-y-1 hover:shadow-stripe-hover overflow-hidden">
      {/* Ambient hover glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent-primary/20 blur-[60px] opacity-0 transition-opacity duration-700 ease-apple group-hover:opacity-50" />
        <p className="text-sm text-text-muted">
          Could not load weekly report.
        </p>
      </div>
    );

  const { stats } = report;

  return (
    <div className="group relative rounded-2xl border border-white/5 bg-bg-card/80 backdrop-blur-xl p-6 shadow-card transition-all duration-500 ease-apple hover:-translate-y-1 hover:shadow-stripe-hover overflow-hidden">
      {/* Ambient hover glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent-primary/20 blur-[60px] opacity-0 transition-opacity duration-700 ease-apple group-hover:opacity-50" />
      <div className="flex items-start justify-between mb-5">
        <SectionHeader
          icon={<Calendar className="h-5 w-5" />}
          title="Weekly Report"
          subtitle={`${new Date(report.weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(report.weekEnd).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
        />
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-white transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          {
            label: "Check-ins",
            value: `${stats.checkInsLogged}/7`,
            sub: `${stats.averageWellness}% avg`,
          },
          {
            label: "Quests",
            value: `${stats.questsCompleted}/${stats.questsTotal}`,
            sub: "completed",
          },
          {
            label: "Focus",
            value: `${stats.focusSessionsCompleted}`,
            sub: `${stats.totalFocusMinutes} min`,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl bg-bg-panel border border-border px-3 py-2.5 text-center"
          >
            <p className="text-[10px] uppercase tracking-wider text-text-muted">
              {item.label}
            </p>
            <p className="text-lg font-bold text-white my-0.5">
              {item.value}
            </p>
            <p className="text-[10px] text-text-muted">{item.sub}</p>
          </div>
        ))}
      </div>

      {stats.mostProductiveDay && (
        <div className="flex items-center gap-2 mb-3 text-xs text-text-secondary">
          <Zap className="h-3.5 w-3.5 text-yellow-400" />
          Most productive day:{" "}
          <span className="font-semibold text-white">
            {stats.mostProductiveDay}
          </span>
        </div>
      )}

      <div className="rounded-xl bg-accent-primary/5 border border-accent-primary/15 p-3">
        <p className="text-xs text-text-secondary leading-relaxed">
          <Sparkles className="h-3.5 w-3.5 text-accent-primary inline mr-1.5" />
          {report.aiSummary}
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { getAuthHeaders } = useAuth();

  const [correlation, setCorrelation] =
    useState<CorrelationReport | null>(null);
  const [burnout, setBurnout] = useState<BurnoutReport | null>(null);
  const [moodPatterns, setMoodPatterns] = useState<MoodPattern | null>(
    null,
  );
  const [streaks, setStreaks] = useState<StreakReport | null>(null);
  const [weeklyReport, setWeeklyReport] =
    useState<WeeklyReport | null>(null);

  const [loadingCorr, setLoadingCorr] = useState(true);
  const [loadingBurnout, setLoadingBurnout] = useState(true);
  const [loadingMood, setLoadingMood] = useState(true);
  const [loadingStreaks, setLoadingStreaks] = useState(true);
  const [loadingWeekly, setLoadingWeekly] = useState(true);

  const fetchCorrelation = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers) return;
    setLoadingCorr(true);
    try {
      const res = await fetch("/api/analytics/correlation", {
        headers,
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as {
          report: CorrelationReport;
        };
        setCorrelation(data.report);
      }
    } finally {
      setLoadingCorr(false);
    }
  }, [getAuthHeaders]);

  const fetchBurnout = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers) return;
    setLoadingBurnout(true);
    try {
      const res = await fetch("/api/analytics/burnout", {
        headers,
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { report: BurnoutReport };
        setBurnout(data.report);
      }
    } finally {
      setLoadingBurnout(false);
    }
  }, [getAuthHeaders]);

  const fetchMoodPatterns = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers) return;
    setLoadingMood(true);
    try {
      const res = await fetch("/api/analytics/mood-patterns", {
        headers,
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { patterns: MoodPattern };
        setMoodPatterns(data.patterns);
      }
    } finally {
      setLoadingMood(false);
    }
  }, [getAuthHeaders]);

  const fetchStreaks = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers) return;
    setLoadingStreaks(true);
    try {
      const res = await fetch("/api/analytics/streaks", {
        headers,
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { report: StreakReport };
        setStreaks(data.report);
      }
    } finally {
      setLoadingStreaks(false);
    }
  }, [getAuthHeaders]);

  const fetchWeeklyReport = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers) return;
    setLoadingWeekly(true);
    try {
      const res = await fetch("/api/reports/weekly", {
        headers,
        cache: "no-store",
      });
      if (res.ok) {
        const data = (await res.json()) as { report: WeeklyReport };
        setWeeklyReport(data.report);
      }
    } finally {
      setLoadingWeekly(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    void fetchCorrelation();
    void fetchBurnout();
    void fetchMoodPatterns();
    void fetchStreaks();
    void fetchWeeklyReport();
  }, [
    fetchCorrelation,
    fetchBurnout,
    fetchMoodPatterns,
    fetchStreaks,
    fetchWeeklyReport,
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl animate-fade-in space-y-6 pb-10 text-text-primary">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary border border-accent-primary/20 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
          <BarChart3 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Analytics
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Deep patterns from your digital twin data.
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {/* Weekly Report Hero Row */}
        <div className="md:col-span-3">
          <WeeklyReportCard
            report={weeklyReport}
            loading={loadingWeekly}
            onRefresh={fetchWeeklyReport}
          />
        </div>

        {/* Row 2: Correlation (2x wide) vs Burnout */}
        <div className="md:col-span-2">
          <CorrelationCard
            report={correlation}
            loading={loadingCorr}
          />
        </div>
        <div className="md:col-span-1">
          <BurnoutCard report={burnout} loading={loadingBurnout} />
        </div>

        {/* Row 3: Mood vs Streaks (2x wide) */}
        <div className="md:col-span-1">
          <MoodPatternsCard
            patterns={moodPatterns}
            loading={loadingMood}
          />
        </div>
        <div className="md:col-span-2">
          <StreaksCard report={streaks} loading={loadingStreaks} />
        </div>
      </div>
    </div>
  );
}
