"use client";

import React from "react";
import { Star } from "lucide-react";
import { getAvatarTier } from "@/lib/progression";
import { ProgressBar } from "@/components/ui";

export interface ProfileHeaderProps {
  name: string;
  avatarStage: string;
  level: number;
  currentXP: number;
  requiredXP: number;
}

/**
 * ProfileHeader - Main focal point of the profile page
 * Displays avatar, username, level, and XP progress with Duolingo-style glow effects
 */
export function ProfileHeader({
  name,
  avatarStage,
  level,
  currentXP,
  requiredXP,
}: ProfileHeaderProps) {
  const xpPercent = requiredXP > 0 ? Math.round((currentXP / requiredXP) * 100) : 0;

  const tier = getAvatarTier(level);
  const TierIcon = tier.icon;

  return (
    <section className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-border bg-bg-card p-8 shadow-elevated">
      {/* Background Subtle Glow overlay */}
      <div className="absolute top-0 h-1/2 w-full bg-gradient-to-b from-accent-primary/10 to-transparent pointer-events-none" />

      {/* Avatar Ring with Glow Effect */}
      <div className="relative z-10 flex w-full justify-center">
        <div
          className={`flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br ${tier.colors} p-[3px] ${tier.glow}`}
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-bg-base border-[3px] border-bg-card">
            <TierIcon
              className={`h-12 w-12 ${tier.text} ${tier.animation}`}
              strokeWidth={1.8}
            />
          </div>
        </div>

        {/* Level Badge */}
        <div
          className={`absolute -bottom-3 flex items-center justify-center gap-1 whitespace-nowrap rounded-full border-[3px] border-bg-card bg-gradient-to-r ${tier.colors} px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-text-inverse shadow-lg`}
        >
          <Star className="h-3 w-3 fill-current" />
          <span>Level {level}</span>
        </div>
      </div>

      {/* Username */}
      <h1 className="relative z-10 mt-6 text-2xl font-bold tracking-tight text-text-primary">
        {name}
      </h1>

      {/* Subtitle / Avatar Stage */}
      <p className="relative z-10 mt-1 text-sm font-medium text-text-secondary">
        {avatarStage}
      </p>

      {/* XP Progress Bar */}
      <div className="relative z-10 mt-8 w-full max-w-sm px-4">
        <ProgressBar
          value={currentXP}
          max={requiredXP}
          label={`Level ${level} Progress`}
          showPercentage
          size="md"
          shimmer
        />
        <div className="mt-2 flex justify-between text-[11px] font-bold uppercase tracking-wider text-text-muted">
          <span>{currentXP} / {requiredXP} XP</span>
          <span className="text-accent-primary">{xpPercent}% to next level</span>
        </div>
      </div>
    </section>
  );
}

export default ProfileHeader;
