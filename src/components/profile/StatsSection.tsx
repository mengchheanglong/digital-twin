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

  return (
    <Card variant="elevated" className="relative flex h-full flex-col overflow-hidden p-6">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-accent-primary/5 blur-2xl" />

      <h2 className="relative z-10 mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-muted">
        <Activity className="h-4 w-4 text-accent-primary" />
        Statistics
      </h2>

      <div className="relative z-10 grid gap-4 sm:grid-cols-2 md:grid-cols-1">
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
    </Card>
  );
}

export default StatsSection;
