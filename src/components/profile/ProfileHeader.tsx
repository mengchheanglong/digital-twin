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
  const xpPercent =
    requiredXP > 0 ? Math.round((currentXP / requiredXP) * 100) : 0;

  const tier = getAvatarTier(level);
  const TierIcon = tier.icon;

  return (
    <section className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-border bg-bg-card shadow-elevated">
      {/* Multi-layer background */}
      <div className="absolute top-0 h-2/3 w-full bg-gradient-to-b from-accent-primary/12 via-accent-primary/4 to-transparent pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-48 w-[600px] rounded-full bg-accent-primary/8 blur-[80px] pointer-events-none" />

      {/* Top accent stripe */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent-primary/60 to-transparent" />

      {/* Avatar area */}
      <div className="relative z-10 mt-10 flex w-full justify-center">
        {/* Outer glow ring */}
        <div
          className={`absolute h-[124px] w-[124px] rounded-full blur-lg opacity-50 bg-gradient-to-br ${tier.colors}`}
        />

        {/* Avatar ring */}
        <div
          className={`relative flex h-[112px] w-[112px] items-center justify-center rounded-full bg-gradient-to-br ${tier.colors} p-[3px] ${tier.glow}`}
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-bg-card border-2 border-bg-card">
            <TierIcon
              className={`h-[52px] w-[52px] ${tier.text} ${tier.animation}`}
              strokeWidth={1.6}
            />
          </div>
        </div>

        {/* Level badge pinned below avatar */}
        <div
          className={`absolute -bottom-4 flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border-2 border-bg-card bg-gradient-to-r ${tier.colors} px-5 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-lg`}
        >
          <Star className="h-3 w-3 fill-current" />
          <span>Level {level}</span>
        </div>
      </div>

      {/* Name + stage */}
      <div className="relative z-10 mt-8 text-center px-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
          {name}
        </h1>
        {/* Tier name — derived live from level, not the DB avatarStage field */}
        <div
          className={[
            "mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest",
            tier.bg,
            tier.border,
          ].join(" ")}
        >
          <span className={tier.text}>{tier.name}</span>
          <span className="text-text-muted">·</span>
          <span className="text-text-muted">Level {level}</span>
        </div>
      </div>

      {/* XP Progress */}
      <div className="relative z-10 mt-7 mb-8 w-full max-w-sm px-8">
        <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
          <span className="text-text-muted">XP Progress</span>
          <span className="text-accent-primary">{xpPercent}%</span>
        </div>
        <ProgressBar value={currentXP} max={requiredXP} size="lg" shimmer />
        <div className="mt-2 flex justify-between text-[11px] text-text-muted font-semibold">
          <span>{currentXP.toLocaleString()} XP</span>
          <span>{requiredXP.toLocaleString()} XP to next level</span>
        </div>
      </div>
    </section>
  );
}

export default ProfileHeader;
