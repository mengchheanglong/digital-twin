"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  BrainCircuit,
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Shield,
  Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Badge, Pill, Skeleton, EmptyState } from "@/components/ui";

interface PlannedActivity {
  day: string;
  suggestion: string;
  rationale: string;
  type: "quest" | "rest" | "social" | "focus" | "reflection";
}

interface WeeklyPlan {
  weekStarting: string;
  overallTheme: string;
  burnoutRisk: string;
  topPriorityQuests: string[];
  dailySuggestions: PlannedActivity[];
  recoveryProtocol: string | null;
  narrative: string;
  generatedAt: string;
}

const typeConfig: Record<string, { icon: React.ReactNode; tone: "accent" | "info" | "success" | "warning" | "error" }> = {
  quest: { icon: <Zap className="h-3 w-3" />, tone: "accent" },
  rest: { icon: <Shield className="h-3 w-3" />, tone: "info" },
  social: { icon: <BookOpen className="h-3 w-3" />, tone: "success" },
  focus: { icon: <BrainCircuit className="h-3 w-3" />, tone: "warning" },
  reflection: { icon: <BookOpen className="h-3 w-3" />, tone: "error" },
};

const toneSurfaceMap: Record<string, string> = {
  accent: "bg-accent-subtle border-accent-primary/20 text-accent-primary",
  info: "bg-status-info/10 border-status-info/20 text-status-info",
  success: "bg-status-success/10 border-status-success/20 text-status-success",
  warning: "bg-status-warning/10 border-status-warning/20 text-status-warning",
  error: "bg-status-error/10 border-status-error/20 text-status-error",
};

export default function WeeklyPlanCard() {
  const { requireAuth } = useAuth();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchPlan = useCallback(async () => {
    const headers = requireAuth();
    if (!headers) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reports/weekly-plan", { headers, cache: "no-store" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json() as { success: boolean; plan: WeeklyPlan };
      if (data.success) setPlan(data.plan);
      else setError("Could not generate plan.");
    } catch {
      setError("Weekly plan unavailable.");
    } finally {
      setLoading(false);
    }
  }, [requireAuth]);

  useEffect(() => { void fetchPlan(); }, [fetchPlan]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-bg-panel p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Skeleton width={36} height={36} rounded="xl" />
            <div className="space-y-1.5">
              <Skeleton width={120} height={16} rounded="md" />
              <Skeleton width={100} height={12} rounded="md" />
            </div>
          </div>
          <Skeleton width={60} height={24} rounded="full" />
        </div>
        <div className="rounded-xl border border-border bg-bg-card p-4 space-y-2">
          <Skeleton width={80} height={12} rounded="md" />
          <Skeleton width="70%" height={18} rounded="md" />
        </div>
        <Skeleton width="100%" height={14} rounded="md" />
        <div className="space-y-2">
          <Skeleton width={100} height={12} rounded="md" />
          <div className="space-y-1.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton width={16} height={16} rounded="full" />
                <Skeleton width={`${60 + i * 10}%`} height={14} rounded="md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <EmptyState
        icon={<Calendar className="h-6 w-6 text-text-muted" />}
        title="Weekly plan unavailable"
        description={error ?? "Unable to load your weekly blueprint."}
        action={{
          label: "Retry",
          onClick: () => void fetchPlan(),
        }}
      />
    );
  }

  const burnoutTone: "success" | "warning" | "error" = (() => {
    switch (plan.burnoutRisk) {
      case "low": return "success";
      case "moderate": return "warning";
      case "high":
      case "critical":
      default:
        return "error";
    }
  })();

  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-panel p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-subtle border border-accent-primary/20 text-accent-primary">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">Weekly Blueprint</h2>
            <p className="text-[11px] text-text-muted">Week starting {plan.weekStarting}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={burnoutTone}>
            {plan.burnoutRisk} risk
          </Badge>
          <button
            onClick={() => void fetchPlan()}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg-hover text-text-muted hover:text-text-primary hover:bg-bg-active transition-colors focus-ring"
            title="Regenerate plan"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Theme */}
      <div className="rounded-xl border border-border-subtle bg-bg-hover px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">This Week&apos;s Theme</p>
        <p className="text-sm font-semibold text-text-primary">{plan.overallTheme}</p>
      </div>

      {/* Narrative */}
      <p className="text-xs text-text-secondary leading-relaxed">{plan.narrative}</p>

      {/* Recovery protocol */}
      {plan.recoveryProtocol && (
        <div className="rounded-xl border border-status-error/20 bg-status-error/5 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-status-error mb-1">Recovery Protocol</p>
          <p className="text-xs text-text-secondary">{plan.recoveryProtocol}</p>
        </div>
      )}

      {/* Top quests */}
      {plan.topPriorityQuests.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Priority Quests</p>
          <div className="flex flex-wrap gap-2">
            {plan.topPriorityQuests.map((q, i) => (
              <Pill key={i} tone="accent">
                <span className="mr-1 text-[10px] opacity-60">{i + 1}.</span>
                {q}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {/* Expand/collapse daily suggestions */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-[11px] font-semibold text-text-secondary hover:text-text-primary transition-colors py-1 focus-ring rounded-lg"
      >
        <span>Daily Suggestions (7 days)</span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      <div
        className="grid transition-all duration-500 ease-apple"
        style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden space-y-2">
          {plan.dailySuggestions.map((s, i) => {
            const cfg = typeConfig[s.type] ?? typeConfig.quest;
            return (
              <div
                key={i}
                className="flex gap-3 rounded-xl border border-border-subtle bg-bg-hover p-3 transition-all duration-300 hover:border-border-hover hover:bg-bg-active"
              >
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${toneSurfaceMap[cfg.tone]}`}>
                  {cfg.icon}
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-text-primary">{s.day}</p>
                  <p className="text-[11px] text-text-secondary mt-0.5">{s.suggestion}</p>
                  {s.rationale && (
                    <p className="text-[10px] text-text-muted mt-0.5 italic">{s.rationale}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
