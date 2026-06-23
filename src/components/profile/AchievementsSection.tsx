"use client";

import { Award, Lock } from "lucide-react";
import { AchievementCard } from "./AchievementCard";
import { EmptyState } from "@/components/ui";
import { Card } from "@/components/ui";

export interface AchievementsSectionProps {
  badges: string[];
}

const BADGE_META: Record<
  string,
  { icon: string; description: string; colorClass: string }
> = {
  "First Quest": {
    icon: "Q1",
    description: "Completed your first quest and started building momentum.",
    colorClass: "surface-info",
  },
  "Week Warrior": {
    icon: "7D",
    description: "Cleared enough quests to prove you can stay consistent for a full week.",
    colorClass: "surface-accent",
  },
  "Level 10": {
    icon: "L10",
    description: "Reached double-digit level progression.",
    colorClass: "surface-warning",
  },
  "Streak Master": {
    icon: "30D",
    description: "Kept your daily check-ins alive for 30 days.",
    colorClass: "surface-warning",
  },
  Mindful: {
    icon: "ZEN",
    description: "Logged enough check-ins to establish a strong reflection habit.",
    colorClass: "surface-success",
  },
  "Early Bird": {
    icon: "AM",
    description: "Checked in early and set the tone before the day sped up.",
    colorClass: "surface-info",
  },
  "Weekend Warrior": {
    icon: "WKD",
    description: "Stayed active even when the schedule was supposed to be lighter.",
    colorClass: "surface-accent",
  },
  "Night Owl": {
    icon: "PM",
    description: "Logged late-night effort when most systems were already offline.",
    colorClass: "surface-accent",
  },
};

export function AchievementsSection({ badges }: AchievementsSectionProps) {
  const allBadgeKeys = Object.keys(BADGE_META);
  const unlockedSet = new Set(badges);
  const unlockedCount = badges.length;
  const totalCount = allBadgeKeys.length;

  if (!badges.length) {
    return (
      <section className="w-full">
        <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
          <Award className="h-4 w-4 text-status-warning" />
          Achievements
        </h2>

        <EmptyState
          icon={<Award className="h-8 w-8" />}
          title="No achievements yet"
          description="Complete quests and daily logs to unlock badges and build your collection."
        />
      </section>
    );
  }

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-text-secondary">
          <Award className="h-4 w-4 text-status-warning" />
          Achievements
        </h2>
        <span className="rounded-full bg-accent-subtle px-2.5 py-1 text-[11px] font-bold text-accent-primary">
          {unlockedCount} / {totalCount} Unlocked
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {allBadgeKeys.map((badge) => {
          const meta = BADGE_META[badge] || {
            icon: "NEW",
            description: "Unlocked through your recent activity.",
            colorClass: "surface-accent",
          };
          const isUnlocked = unlockedSet.has(badge);

          return (
            <AchievementCard
              key={badge}
              id={badge}
              icon={meta.icon}
              title={badge}
              description={meta.description}
              isUnlocked={isUnlocked}
              colorClass={meta.colorClass}
            />
          );
        })}
      </div>
    </section>
  );
}

export default AchievementsSection;
