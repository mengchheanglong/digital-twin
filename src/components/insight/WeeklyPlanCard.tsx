"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, BrainCircuit, Calendar, ChevronDown, ChevronUp, RefreshCw, Shield, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

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

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  quest: { icon: <Zap className="h-3 w-3" />, color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
  rest: { icon: <Shield className="h-3 w-3" />, color: "text-sky-400 bg-sky-500/10 border-sky-500/20" },
  social: { icon: <BookOpen className="h-3 w-3" />, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  focus: { icon: <BrainCircuit className="h-3 w-3" />, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  reflection: { icon: <BookOpen className="h-3 w-3" />, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
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
      <div className="animate-pulse rounded-2xl border border-border bg-bg-panel p-6">
        <div className="mb-3 h-4 w-48 rounded bg-border" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-3 rounded bg-border" />)}
        </div>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="rounded-xl border border-status-error/20 bg-status-error/10 px-4 py-3 text-sm text-status-error">
        {error ?? "Plan unavailable."}
      </div>
    );
  }

  const burnoutColors: Record<string, string> = {
    low: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    moderate: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    high: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    critical: "text-red-400 bg-red-500/10 border-red-500/20",
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-bg-panel p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Weekly Blueprint</h2>
            <p className="text-[11px] text-text-muted">Week starting {plan.weekStarting}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${burnoutColors[plan.burnoutRisk] ?? burnoutColors.low}`}>
            {plan.burnoutRisk} risk
          </span>
          <button
            onClick={() => void fetchPlan()}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-text-muted hover:text-white hover:bg-white/10 transition-colors"
            title="Regenerate plan"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Theme */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">This Week&apos;s Theme</p>
        <p className="text-sm font-semibold text-white">{plan.overallTheme}</p>
      </div>

      {/* Narrative */}
      <p className="text-xs text-text-secondary leading-relaxed">{plan.narrative}</p>

      {/* Recovery protocol */}
      {plan.recoveryProtocol && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">Recovery Protocol</p>
          <p className="text-xs text-text-secondary">{plan.recoveryProtocol}</p>
        </div>
      )}

      {/* Top quests */}
      {plan.topPriorityQuests.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Priority Quests</p>
          <div className="space-y-1.5">
            {plan.topPriorityQuests.map((q, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-500/20 text-[9px] font-bold text-violet-400 shrink-0">
                  {i + 1}
                </span>
                {q}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expand/collapse daily suggestions */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between text-[11px] font-semibold text-text-secondary hover:text-white transition-colors py-1"
      >
        <span>Daily Suggestions (7 days)</span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <div className="space-y-2 animate-fade-in">
          {plan.dailySuggestions.map((s, i) => {
            const cfg = typeConfig[s.type] ?? typeConfig.quest;
            return (
              <div key={i} className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${cfg.color}`}>
                  {cfg.icon}
                </span>
                <div>
                  <p className="text-[11px] font-semibold text-white">{s.day}</p>
                  <p className="text-[11px] text-text-secondary mt-0.5">{s.suggestion}</p>
                  {s.rationale && (
                    <p className="text-[10px] text-text-muted mt-0.5 italic">{s.rationale}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
