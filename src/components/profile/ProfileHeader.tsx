"use client";

import React from "react";
import { User } from "lucide-react";
import { getAvatarTier } from "@/lib/progression";

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
  // Calculate XP percentage
  const xpPercent = requiredXP > 0 ? Math.round((currentXP / requiredXP) * 100) : 0;
  
  const tier = getAvatarTier(level);
  const TierIcon = tier.icon;

  return (
    <section className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-border bg-bg-card p-8 shadow-xl">
      {/* Background Subtle Glow overlay */}
      <div className="absolute top-0 w-full h-1/2 bg-linear-to-b from-accent-primary/10 to-transparent pointer-events-none" />

      {/* Avatar Ring with Glow Effect */}
      <div className="relative z-10 w-full flex justify-center">
        <div
          className={`flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br ${tier.colors} p-[3px] ${tier.glow}`}
        >
          <div className="flex h-full w-full items-center justify-center rounded-full bg-bg-base border-[3px] border-bg-card">
            <TierIcon className={`h-12 w-12 ${tier.text} ${tier.animation}`} strokeWidth={1.8} />
          </div>
        </div>

        {/* Level Badge */}
        <div className={`absolute -bottom-3 flex items-center justify-center whitespace-nowrap rounded-full border-[3px] border-bg-card bg-gradient-to-r ${tier.colors} px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg`}>
          <span>Lvl {level}</span>
        </div>
      </div>

      {/* Username */}
      <h1 className="mt-6 text-2xl font-bold tracking-tight text-white relative z-10">{name}</h1>

      {/* Subtitle / Avatar Stage */}
      <p className="mt-1 text-sm font-medium text-text-secondary relative z-10">{avatarStage}</p>

      {/* XP Progress Bar */}
      <div className="mt-8 w-full max-w-sm px-4 relative z-10">
        <div className="h-2 w-full overflow-hidden rounded-full bg-bg-panel border border-border/50">
          <div
            className="h-full rounded-full bg-accent-primary shadow-[0_0_10px_rgba(139,92,246,0.5)] transition-all duration-500"
            style={{
              width: `${xpPercent}%`,
            }}
          />
        </div>

        {/* XP Label */}
        <div className="mt-2.5 flex justify-between text-[11px] font-bold uppercase tracking-wider text-text-muted">
          <span>Level {level} Progress</span>
          <span className="text-accent-primary">
            {currentXP} / {requiredXP} XP
          </span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes xpShimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </section>
  );
}

export default ProfileHeader;
