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
  Link2,
  RefreshCw,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  Button,
  Card,
  Skeleton,
  EmptyState,
  useToast,
} from "@/components/ui";

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

interface BurnoutStageInfo {
  stage: string;
  label: string;
  color: string;
  description: string;
}

interface BurnoutReport {
  riskScore: number;
  riskLevel: "low" | "moderate" | "high" | "critical";
  stage?: BurnoutStageInfo;
  factors: BurnoutFactor[];
  recommendations: string[];
  personalizedInterventions?: string[];
}

interface SynergyPair {
  habitA: string;
  habitB: string;
  dimension: string;
  liftPercent: number;
  sampleCount: number;
  description: string;
}

interface SynergyReport {
  pairs: SynergyPair[];
  message: string;
}

interface HourlyBucket {
  hour: number;
  label: string;
  averagePercentage: number;
  sampleCount: number;
  dimensions: {
    energy: number;
    focus: number;
    stressControl: number;
    socialConnection: number;
    optimism: number;
  };
}

interface DailyRhythmReport {
  buckets: HourlyBucket[];
  peakFocusWindow: string | null;
  peakEnergyWindow: string | null;
  lowestHour: string | null;
  totalMicroCheckIns: number;
  message: string;
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
  if (level === "critical") return "text-status-error";
  if (level === "high") return "text-status-warning";
  if (level === "moderate") return "text-status-warning";
  return "text-status-success";
}

function burnoutBg(level: string): string {
  if (level === "critical") return "bg-status-error/10 border-status-error/20";
  if (level === "high") return "bg-status-warning/10 border-status-warning/20";
  if (level === "moderate") return "bg-status-warning/10 border-status-warning/20";
  return "bg-status-success/10 border-status-success/20";
}

function trendIcon(trend: string) {
  if (trend === "improving")
    return <TrendingUp className="h-4 w-4 text-status-success" />;
  if (trend === "declining")
    return <TrendingDown className="h-4 w-4 text-status-error" />;
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
        <h2 className="text-base font-bold text-text-primary">{title}</h2>
        <p className="text-xs text-text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <Card variant="default" className="p-6">
      <Skeleton width="100%" height={160} rounded="lg" />
    </Card>
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
    <Card variant="glass" className="relative p-6 overflow-hidden group">
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
              const pct = Math.round(((c.coefficient + 1) / 2) * 100);
              const isPositive = c.coefficient >= 0;
              return (
                <div key={c.dimension}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-text-secondary">
                      {dimensionLabel(c.dimension)}
                    </span>
                    <span
                      className={`text-xs font-bold ${isPositive ? "text-status-success" : "text-status-error"}`}
                    >
                      r = {c.coefficient > 0 ? "+" : ""}
                      {c.coefficient}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-bg-base rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${isPositive ? "bg-status-success" : "bg-status-error"}`}
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
    </Card>
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
      <Card variant="glass" className="relative p-6 overflow-hidden">
        <p className="text-sm text-text-muted">
          Could not load burnout data.
        </p>
      </Card>
    );

  return (
    <Card
      variant="glass"
      className={`relative p-6 overflow-hidden group ${burnoutBg(report.riskLevel)}`}
    >
      <div
        className={`pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-[60px] opacity-0 transition-opacity duration-700 ease-apple group-hover:opacity-40 ${
          report.riskLevel === "critical"
            ? "bg-status-error"
            : report.riskLevel === "high"
            ? "bg-status-warning"
            : report.riskLevel === "moderate"
            ? "bg-status-warning"
            : "bg-status-success"
        }`}
      />
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
          <p className="text-lg font-bold text-text-primary capitalize">
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
        className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
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
          {report.stage && (
            <div className="rounded-xl border border-border bg-bg-panel/40 px-3 py-2 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">Current Stage</p>
              <p className="text-xs font-semibold text-text-primary">{report.stage.label}</p>
              <p className="text-[11px] text-text-secondary mt-0.5">{report.stage.description}</p>
            </div>
          )}
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
                    className="h-full bg-status-warning rounded-full transition-all duration-700"
                    style={{ width: `${f.score}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          {report.personalizedInterventions && report.personalizedInterventions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Personalized Actions</p>
              {report.personalizedInterventions.map((intervention, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-primary/20 text-[9px] font-bold text-accent-primary">
                    {i + 1}
                  </span>
                  <p className="text-[11px] text-text-secondary">{intervention}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Synergy Card ─────────────────────────────────────────────────────────────

function SynergyCard({
  report,
  loading,
}: {
  report: SynergyReport | null;
  loading: boolean;
}) {
  if (loading) return <LoadingCard />;

  return (
    <Card variant="glass" className="relative p-6 overflow-hidden group">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent-primary/20 blur-[60px] opacity-0 transition-opacity duration-700 ease-apple group-hover:opacity-50" />
      <SectionHeader
        icon={<Link2 className="h-5 w-5" />}
        title="Habit Synergies"
        subtitle="Habits that boost each other"
      />
      {!report || !report.pairs.length ? (
        <p className="text-xs text-text-muted">{report?.message ?? "No synergy data yet."}</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-text-secondary">{report.message}</p>
          {report.pairs.map((pair, i) => (
            <div key={i} className="rounded-xl border border-border bg-bg-panel/40 p-3 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-text-primary">
                  {pair.habitA} + {pair.habitB}
                </p>
                <span className="shrink-0 rounded-full bg-status-success/10 border border-status-success/20 px-2 py-0.5 text-[10px] font-bold text-status-success">
                  +{pair.liftPercent}% {pair.dimension}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary">{pair.description}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// ─── Daily Rhythm Card ────────────────────────────────────────────────────────

function DailyRhythmCard({
  report,
  loading,
}: {
  report: DailyRhythmReport | null;
  loading: boolean;
}) {
  if (loading) return <LoadingCard />;

  return (
    <Card variant="glass" className="relative p-6 overflow-hidden group">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent-primary/20 blur-[60px] opacity-0 transition-opacity duration-700 ease-apple group-hover:opacity-50" />
      <SectionHeader
        icon={<Flame className="h-5 w-5" />}
        title="Daily Rhythm"
        subtitle="Your energy patterns by hour"
      />
      {!report || !report.buckets.length ? (
        <div className="space-y-3">
          <p className="text-xs text-text-muted">{report?.message ?? "No micro check-in data yet."}</p>
          <div className="rounded-xl border border-accent-primary/20 bg-accent-primary/5 p-3">
            <p className="text-[11px] text-text-secondary">
              💡 Use <strong className="text-text-primary">micro check-ins</strong> throughout your day to discover your energy patterns. Log a quick pulse from the check-in page.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-text-secondary">{report.message}</p>
          {/* Hour bars */}
          <div className="flex items-end gap-1 h-24">
            {report.buckets.map((b) => {
              const pct = b.averagePercentage;
              const barColor = pct >= 65 ? "bg-status-success" : pct >= 45 ? "bg-status-warning" : "bg-status-error";
              return (
                <div key={b.hour} className="flex flex-col items-center gap-1 flex-1 group/bar relative">
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover/bar:block z-10 w-28 rounded-lg border border-border bg-bg-card px-2 py-1.5 text-[10px] text-text-secondary shadow-elevated text-center">
                    {b.label}: {pct}%<br /><span className="text-[9px] text-text-muted">{b.sampleCount} readings</span>
                  </div>
                  <div className="relative w-full rounded bg-bg-panel" style={{ height: 64 }}>
                    <div
                      className={`absolute bottom-0 w-full rounded transition-all duration-700 ${barColor}`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-text-muted">{b.label}</span>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {report.peakEnergyWindow && (
              <div className="rounded-xl border border-status-warning/20 bg-status-warning/5 px-3 py-2">
                <p className="text-[9px] text-text-muted uppercase tracking-wider">Peak Energy</p>
                <p className="text-xs font-bold text-status-warning">{report.peakEnergyWindow}</p>
              </div>
            )}
            {report.peakFocusWindow && (
              <div className="rounded-xl border border-status-info/20 bg-status-info/5 px-3 py-2">
                <p className="text-[9px] text-text-muted uppercase tracking-wider">Peak Focus</p>
                <p className="text-xs font-bold text-status-info">{report.peakFocusWindow}</p>
              </div>
            )}
            {report.lowestHour && (
              <div className="rounded-xl border border-text-muted/20 bg-text-muted/5 px-3 py-2">
                <p className="text-[9px] text-text-muted uppercase tracking-wider">Lowest Energy</p>
                <p className="text-xs font-bold text-text-muted">{report.lowestHour}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// ─── What-If Simulator ────────────────────────────────────────────────────────

const DIMENSION_DEFAULTS = { energy: 3, focus: 3, stressControl: 3, socialConnection: 3, optimism: 3 };

function SimulatorCard() {
  const [dims, setDims] = useState<Record<string, number>>(DIMENSION_DEFAULTS);
  const [questsPerWeek, setQuestsPerWeek] = useState(5);
  const [entertainmentRatio, setEntertainmentRatio] = useState(30);

  const avgDim = Object.values(dims).reduce((a, b) => a + b, 0) / 5;
  const wellnessScore = Math.round(((avgDim - 1) / 4) * 100);
  const productivityScore = Math.round(Math.min(100, (questsPerWeek / 14) * 100) * (1 - entertainmentRatio / 100));
  const burnoutRisk = Math.max(0, Math.round(100 - wellnessScore * 0.5 - productivityScore * 0.5 + entertainmentRatio * 0.2));
  const burnoutLabel = burnoutRisk >= 75 ? "Critical" : burnoutRisk >= 50 ? "High" : burnoutRisk >= 25 ? "Moderate" : "Low";
  const burnoutColor2 = burnoutRisk >= 75 ? "text-status-error" : burnoutRisk >= 50 ? "text-status-warning" : burnoutRisk >= 25 ? "text-status-warning" : "text-status-success";

  const dimLabels: Record<string, string> = {
    energy: "⚡ Energy",
    focus: "🎯 Focus",
    stressControl: "🧘 Stress Control",
    socialConnection: "🤝 Social",
    optimism: "🌟 Optimism",
  };

  return (
    <Card variant="glass" className="relative p-6 overflow-hidden group">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent-primary/20 blur-[60px] opacity-0 transition-opacity duration-700 ease-apple group-hover:opacity-50" />
      <SectionHeader
        icon={<Sliders className="h-5 w-5" />}
        title="What-If Simulator"
        subtitle="Drag sliders to predict your wellness outcome"
      />

      <div className="space-y-3 mb-5">
        {Object.entries(dims).map(([key, val]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="w-32 text-[11px] text-text-secondary shrink-0">{dimLabels[key]}</span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={val}
              onChange={(e) => setDims((d) => ({ ...d, [key]: Number(e.target.value) }))}
              className="flex-1 accent-accent-primary"
            />
            <span className="w-4 text-center text-[11px] font-bold text-text-primary shrink-0">{val}</span>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <span className="w-32 text-[11px] text-text-secondary shrink-0">🎯 Quests/week</span>
          <input
            type="range" min={0} max={21} step={1} value={questsPerWeek}
            onChange={(e) => setQuestsPerWeek(Number(e.target.value))}
            className="flex-1 accent-accent-primary"
          />
          <span className="w-4 text-center text-[11px] font-bold text-text-primary shrink-0">{questsPerWeek}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-32 text-[11px] text-text-secondary shrink-0">📺 Entertainment</span>
          <input
            type="range" min={0} max={100} step={5} value={entertainmentRatio}
            onChange={(e) => setEntertainmentRatio(Number(e.target.value))}
            className="flex-1 accent-accent-primary"
          />
          <span className="w-8 text-center text-[11px] font-bold text-text-primary shrink-0">{entertainmentRatio}%</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-status-success/20 bg-status-success/5 px-3 py-2 text-center">
          <p className="text-[9px] text-text-muted uppercase tracking-wider mb-1">Wellness</p>
          <p className="text-lg font-bold text-status-success">{wellnessScore}%</p>
        </div>
        <div className="rounded-xl border border-status-info/20 bg-status-info/5 px-3 py-2 text-center">
          <p className="text-[9px] text-text-muted uppercase tracking-wider mb-1">Productivity</p>
          <p className="text-lg font-bold text-status-info">{productivityScore}%</p>
        </div>
        <div className={`rounded-xl border px-3 py-2 text-center ${burnoutRisk >= 75 ? "border-status-error/20 bg-status-error/5" : burnoutRisk >= 50 ? "border-status-warning/20 bg-status-warning/5" : burnoutRisk >= 25 ? "border-status-warning/20 bg-status-warning/5" : "border-status-success/20 bg-status-success/5"}`}>
          <p className="text-[9px] text-text-muted uppercase tracking-wider mb-1">Burnout Risk</p>
          <p className={`text-sm font-bold ${burnoutColor2}`}>{burnoutLabel}</p>
        </div>
      </div>
    </Card>
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
      <Card variant="glass" className="relative p-6 overflow-hidden">
        <EmptyState
          icon={<Brain className="h-8 w-8" />}
          title="Mood patterns unavailable"
          description="Could not load mood patterns."
        />
      </Card>
    );

  const maxScore = Math.max(
    ...patterns.allDays
      .filter((d) => d.sampleCount > 0)
      .map((d) => d.averageScore),
    1,
  );

  return (
    <Card variant="glass" className="relative p-6 overflow-hidden group">
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
        <div className="rounded-xl bg-status-success/10 border border-status-success/20 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-text-muted mb-0.5">
            Best Day
          </p>
          <p className="text-sm font-bold text-status-success">
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
    </Card>
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
      <Card variant="glass" className="relative p-6 overflow-hidden">
        <EmptyState
          icon={<Flame className="h-8 w-8" />}
          title="Streak data unavailable"
          description="Could not load streak data."
        />
      </Card>
    );

  return (
    <Card variant="glass" className="relative p-6 overflow-hidden group">
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
              <span className="text-xl font-bold text-text-primary">
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
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-status-warning/10 border border-status-warning/20 px-3 py-2">
          <Flame className="h-4 w-4 text-status-warning" />
          <span className="text-sm text-status-warning font-semibold">
            {report.overallStreak} day overall streak
          </span>
        </div>
      )}
    </Card>
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
      <Card variant="glass" className="relative p-6 overflow-hidden">
        <EmptyState
          icon={<Calendar className="h-8 w-8" />}
          title="Weekly report unavailable"
          description="Could not load weekly report."
        />
      </Card>
    );

  const { stats } = report;

  return (
    <Card variant="glass" className="relative p-6 overflow-hidden group">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent-primary/20 blur-[60px] opacity-0 transition-opacity duration-700 ease-apple group-hover:opacity-50" />
      <div className="flex items-start justify-between mb-5">
        <SectionHeader
          icon={<Calendar className="h-5 w-5" />}
          title="Weekly Report"
          subtitle={`${new Date(report.weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(report.weekEnd).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`}
        />
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<RefreshCw className="h-3 w-3" />}
          onClick={onRefresh}
        >
          Refresh
        </Button>
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
            <p className="text-lg font-bold text-text-primary my-0.5">
              {item.value}
            </p>
            <p className="text-[10px] text-text-muted">{item.sub}</p>
          </div>
        ))}
      </div>

      {stats.mostProductiveDay && (
        <div className="flex items-center gap-2 mb-3 text-xs text-text-secondary">
          <Zap className="h-3.5 w-3.5 text-status-warning" />
          Most productive day:{" "}
          <span className="font-semibold text-text-primary">
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
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { getAuthHeaders } = useAuth();
  const { toast } = useToast();

  const [correlation, setCorrelation] =
    useState<CorrelationReport | null>(null);
  const [burnout, setBurnout] = useState<BurnoutReport | null>(null);
  const [moodPatterns, setMoodPatterns] = useState<MoodPattern | null>(
    null,
  );
  const [streaks, setStreaks] = useState<StreakReport | null>(null);
  const [weeklyReport, setWeeklyReport] =
    useState<WeeklyReport | null>(null);
  const [synergy, setSynergy] = useState<SynergyReport | null>(null);
  const [dailyRhythm, setDailyRhythm] = useState<DailyRhythmReport | null>(null);

  const [loadingCorr, setLoadingCorr] = useState(true);
  const [loadingBurnout, setLoadingBurnout] = useState(true);
  const [loadingMood, setLoadingMood] = useState(true);
  const [loadingStreaks, setLoadingStreaks] = useState(true);
  const [loadingWeekly, setLoadingWeekly] = useState(true);
  const [loadingSynergy, setLoadingSynergy] = useState(true);
  const [loadingRhythm, setLoadingRhythm] = useState(true);

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
    } catch {
      toast({ title: "Error", description: "Could not load correlation data.", variant: "error" });
    } finally {
      setLoadingCorr(false);
    }
  }, [getAuthHeaders, toast]);

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
    } catch {
      toast({ title: "Error", description: "Could not load burnout data.", variant: "error" });
    } finally {
      setLoadingBurnout(false);
    }
  }, [getAuthHeaders, toast]);

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
    } catch {
      toast({ title: "Error", description: "Could not load mood patterns.", variant: "error" });
    } finally {
      setLoadingMood(false);
    }
  }, [getAuthHeaders, toast]);

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
    } catch {
      toast({ title: "Error", description: "Could not load streaks.", variant: "error" });
    } finally {
      setLoadingStreaks(false);
    }
  }, [getAuthHeaders, toast]);

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
    } catch {
      toast({ title: "Error", description: "Could not load weekly report.", variant: "error" });
    } finally {
      setLoadingWeekly(false);
    }
  }, [getAuthHeaders, toast]);

  const fetchSynergy = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers) return;
    setLoadingSynergy(true);
    try {
      const res = await fetch("/api/analytics/synergy", { headers, cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { success: boolean; report: SynergyReport };
        if (data.success) setSynergy(data.report);
      }
    } catch {
      toast({ title: "Error", description: "Could not load synergy data.", variant: "error" });
    } finally {
      setLoadingSynergy(false);
    }
  }, [getAuthHeaders, toast]);

  const fetchDailyRhythm = useCallback(async () => {
    const headers = getAuthHeaders();
    if (!headers) return;
    setLoadingRhythm(true);
    try {
      const res = await fetch("/api/analytics/daily-rhythm", { headers, cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as { success: boolean; report: DailyRhythmReport };
        if (data.success) setDailyRhythm(data.report);
      }
    } catch {
      toast({ title: "Error", description: "Could not load daily rhythm.", variant: "error" });
    } finally {
      setLoadingRhythm(false);
    }
  }, [getAuthHeaders, toast]);

  useEffect(() => {
    void fetchCorrelation();
    void fetchBurnout();
    void fetchMoodPatterns();
    void fetchStreaks();
    void fetchWeeklyReport();
    void fetchSynergy();
    void fetchDailyRhythm();
  }, [
    fetchCorrelation,
    fetchBurnout,
    fetchMoodPatterns,
    fetchStreaks,
    fetchWeeklyReport,
    fetchSynergy,
    fetchDailyRhythm,
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl animate-fade-in space-y-6 pb-10 text-text-primary">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary border border-accent-primary/20 shadow-glow-soft">
          <BarChart3 className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
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

        {/* Row 4: What-If Simulator (full width) */}
        <div className="md:col-span-3">
          <SimulatorCard />
        </div>

        {/* Row 5: Synergy (2/3) + Daily Rhythm (1/3) */}
        <div className="md:col-span-2">
          <SynergyCard report={synergy} loading={loadingSynergy} />
        </div>
        <div className="md:col-span-1">
          <DailyRhythmCard report={dailyRhythm} loading={loadingRhythm} />
        </div>
      </div>
    </div>
  );
}
