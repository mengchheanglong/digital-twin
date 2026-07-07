"use client";

import { Activity, Flame, ListChecks, Target } from "lucide-react";
import type { ProfileMood } from "./ProfilePage";
import { StatCard } from "./StatCard";
import { Card } from "@/components/ui";

export interface StatsSectionProps {
  dailyStreak: number;
  totalQuests: number;
  completedQuests: number;
  currentMood?: ProfileMood;
}

export function StatsSection({
  dailyStreak,
  totalQuests,
  completedQuests,
  currentMood,
}: StatsSectionProps) {
  const completionRate = totalQuests > 0
    ? Math.round((completedQuests / totalQuests) * 100)
    : 0;
  const remainingQuests = Math.max(0, totalQuests - completedQuests);

  return (
    <Card variant="elevated" className="relative flex h-full flex-col overflow-hidden p-4 sm:p-5">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border-hover to-transparent" />

      <div className="relative z-10 mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
            Daily state
          </p>
          <h2 className="mt-1 text-base font-black tracking-tight text-text-primary">
            Momentum overview
          </h2>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-bg-panel text-accent-primary">
          <Activity className="h-4.5 w-4.5" />
        </div>
      </div>

      <div className="relative z-10 grid gap-3 sm:grid-cols-2">
        <StatCard
          icon={<Flame className="h-5 w-5" />}
          value={dailyStreak}
          label="Day Streak"
          color="warning"
        />
        <StatCard
          icon={<ListChecks className="h-5 w-5" />}
          value={completedQuests}
          label="Quests Cleared"
          color="success"
        />
        <StatCard
          icon={<Target className="h-5 w-5" />}
          value={`${completionRate}%`}
          label="Quest Completion"
          color="accent"
        />
        <StatCard
          icon={<Activity className="h-5 w-5" />}
          value={currentMood ? `${currentMood.emoji} ${currentMood.label}` : "No data"}
          label="Current Mood"
          color="info"
        />
      </div>

      <div className="relative z-10 mt-4 rounded-xl border border-border-subtle bg-bg-panel/60 px-3 py-2.5">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-text-secondary">Open quests</span>
          <span className="font-mono font-bold text-text-primary tabular-nums">
            {remainingQuests} / {totalQuests}
          </span>
        </div>
      </div>
    </Card>
  );
}

export default StatsSection;
