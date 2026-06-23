"use client";

import { ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Lock,
  MessageSquareQuote,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui";

interface TodayStatusCardProps {
  completed: boolean;
  summary: string;
  activityCount: number;
  mainTheme: string;
  onStartCheckIn?: () => void;
}

interface ReflectionCardProps {
  reflection: string;
  className?: string;
}

interface InsightStatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  tone: "violet" | "emerald" | "amber" | "rose";
  className?: string;
}

const statToneMap: Record<
  InsightStatCardProps["tone"],
  {
    container: string;
    icon: string;
    value: string;
    ambient: string;
  }
> = {
  violet: {
    container: "border-border-subtle hover:border-accent-primary/30",
    icon: "bg-accent-subtle border-accent-primary/20 text-accent-primary",
    value: "text-text-primary",
    ambient: "bg-accent-primary",
  },
  emerald: {
    container: "border-border-subtle hover:border-status-success/30",
    icon: "bg-status-success/10 border-status-success/20 text-status-success",
    value: "text-text-primary",
    ambient: "bg-status-success",
  },
  amber: {
    container: "border-border-subtle hover:border-status-warning/30",
    icon: "bg-status-warning/10 border-status-warning/20 text-status-warning",
    value: "text-text-primary",
    ambient: "bg-status-warning",
  },
  rose: {
    container: "border-border-subtle hover:border-status-error/30",
    icon: "bg-status-error/10 border-status-error/20 text-status-error",
    value: "text-text-primary",
    ambient: "bg-status-error",
  },
};

export function TodayStatusCard({
  completed,
  summary,
  activityCount,
  mainTheme,
  onStartCheckIn,
}: TodayStatusCardProps) {
  const incompleteSummary =
    "Your twin hasn't seen today's activity yet. Log your day to reveal today's insight.";

  return (
    <article
      className={[
        "group relative overflow-hidden rounded-2xl border p-7 transition-all duration-500 ease-apple",
        completed
          ? "bg-bg-card border-border-subtle hover:border-status-success/30 shadow-card hover:shadow-elevated hover:-translate-y-1"
          : "bg-bg-card border-border-subtle hover:border-status-warning/30 shadow-card hover:shadow-elevated hover:-translate-y-1",
      ].join(" ")}
    >
      {/* Ambient glow blobs */}
      <div
        className={[
          "pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-[60px] transition-all duration-700 ease-apple opacity-30 group-hover:opacity-70 group-hover:scale-110",
          completed ? "bg-status-success/20" : "bg-status-warning/20",
        ].join(" ")}
      />
      {!completed && (
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-status-warning/10 blur-[50px] transition-all duration-700 ease-apple opacity-30 group-hover:opacity-60 group-hover:scale-110" />
      )}

      <div className="relative z-10">
        {/* Top row */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted mb-2">
              Today&apos;s Log
            </p>
            <h2 className="text-2xl font-bold text-text-primary sm:text-3xl tracking-tight">
              {completed ? "All Logged" : "Not Logged Yet"}
            </h2>
          </div>

          <span
            className={[
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold shrink-0",
              completed
                ? "border-status-success/30 bg-status-success/10 text-status-success"
                : "border-status-warning/40 bg-status-warning/10 text-status-warning",
            ].join(" ")}
          >
            {completed ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
            {completed ? "Complete" : "Pending"}
          </span>
        </div>

        {/* Summary text */}
        <p className="text-sm leading-relaxed text-text-secondary max-w-2xl">
          {completed ? summary : incompleteSummary}
        </p>

        {/* Tags / Meta */}
        <div className="mt-5 flex flex-wrap gap-2">
          {completed ? (
            <>
              <MetaTag>
                {activityCount} {activityCount === 1 ? "activity" : "activities"} logged
              </MetaTag>
              <MetaTag>Theme: {mainTheme || "General"}</MetaTag>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-status-success/30 bg-status-success/10 px-3 py-1 text-[11px] font-bold text-status-success">
                <Sparkles className="h-3 w-3" />
                Reflection unlocked
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-status-warning/30 bg-status-warning/10 px-3 py-1 text-[11px] font-bold text-status-warning">
              <span className="h-1.5 w-1.5 rounded-full bg-status-warning animate-pulse" />
              Waiting for today&apos;s data
            </span>
          )}
        </div>

        {/* CTA */}
        {!completed && (
          <div className="mt-6">
            <Button
              onClick={onStartCheckIn}
              size="md"
              rightIcon={<ArrowRight className="h-4 w-4 transition-transform duration-300 ease-apple group-hover:translate-x-1" />}
              className="btn-glow"
            >
              Start Daily Check-In
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

function MetaTag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-xl border border-border bg-bg-panel px-3 py-1 text-[11px] font-semibold text-text-secondary">
      {children}
    </span>
  );
}

export function ReflectionCard({ reflection, className = "" }: ReflectionCardProps) {
  return (
    <article
      className={[
        "group relative overflow-hidden rounded-2xl border border-border-subtle bg-bg-card/80 backdrop-blur-xl p-6 shadow-card transition-all duration-500 ease-apple",
        "hover:border-accent-primary/30 hover:shadow-elevated hover:-translate-y-1",
        className,
      ].join(" ")}
    >
      {/* Background glow */}
      <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-accent-primary/15 blur-[60px] transition-all duration-700 ease-apple opacity-40 group-hover:opacity-70 group-hover:scale-110" />

      <div className="relative z-10">
        {/* Badge */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-xl border border-accent-primary/30 bg-accent-subtle px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-primary">
          <Bot className="h-3.5 w-3.5" />
          Daily Reflection
        </div>

        {/* Quotation mark decoration */}
        <div className="absolute right-6 top-5 text-6xl leading-none text-accent-primary/10 font-serif select-none pointer-events-none">
          &ldquo;
        </div>

        <p className="max-w-4xl text-base leading-relaxed text-text-primary sm:text-[17px]">
          {reflection || "Your twin is still observing today. Log your day to reveal a deeper reflection."}
        </p>
      </div>
    </article>
  );
}

export function InsightStatCard({ label, value, icon, tone, className = "" }: InsightStatCardProps) {
  const toneStyles = statToneMap[tone];
  return (
    <article
      className={[
        "group relative rounded-2xl border bg-bg-card/80 backdrop-blur-xl p-5 shadow-card transition-all duration-500 ease-apple overflow-hidden",
        "hover:-translate-y-1 hover:shadow-elevated",
        toneStyles.container,
        className,
      ].join(" ")}
    >
      {/* Ambient background glow */}
      <div
        className={[
          "pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-[40px] opacity-0 transition-all duration-700 ease-apple group-hover:opacity-60 group-hover:scale-110",
          toneStyles.ambient,
        ].join(" ")}
      />

      <div className="flex items-start justify-between mb-4 relative z-10">
        <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
        <span
          className={[
            "inline-flex items-center justify-center rounded-xl p-2 shadow-sm transition-all duration-500 ease-spring group-hover:scale-110 group-hover:rotate-3 border",
            toneStyles.icon,
          ].join(" ")}
        >
          {icon}
        </span>
      </div>
      <p className={["truncate text-2xl font-bold tracking-tight relative z-10", toneStyles.value].join(" ")}>
        {value}
      </p>

      {/* Subtle background shimmer on hover */}
      <div className="pointer-events-none absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-accent-primary/5 to-transparent transition-transform duration-700 ease-apple group-hover:translate-x-[100%]" />
    </article>
  );
}

export function InsightSectionHeader() {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-bg-panel px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-text-muted hover:border-accent-primary/30 hover:text-text-secondary transition-all duration-200 cursor-default">
      <MessageSquareQuote className="h-3.5 w-3.5" />
      Supporting Signals
    </div>
  );
}
