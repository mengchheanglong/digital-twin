"use client";

import type { ReactNode } from "react";
import { ChevronRight, Flame, Gauge, Orbit, Star, Target } from "lucide-react";
import { getAvatarTier } from "@/lib/progression";
import { ProgressBar } from "@/components/ui";
import type { ProfileMood } from "./ProfilePage";
import { getProfileNameTextSize } from "./profileHeaderName";

export interface ProfileHeaderProps {
  name: string;
  avatarStage: string;
  level: number;
  currentXP: number;
  requiredXP: number;
  dailyStreak?: number;
  questCompletionRate?: number;
  currentMood?: ProfileMood;
}

interface HeaderMetricProps {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}

function HeaderMetric({ icon, label, value, detail }: HeaderMetricProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-black/20 px-3 py-3 shadow-inner-glow backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">
        <span className="text-accent-primary">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="truncate text-2xl font-black leading-none text-text-primary tabular-nums">
        {value}
      </div>
      <div className="mt-1 truncate text-[11px] font-semibold text-text-muted">
        {detail}
      </div>
    </div>
  );
}

export function ProfileHeader({
  name,
  level,
  currentXP,
  requiredXP,
  dailyStreak = 0,
  questCompletionRate = 0,
  currentMood,
}: ProfileHeaderProps) {
  const safeRequiredXP = Math.max(1, requiredXP);
  const xpPercent = Math.min(
    100,
    Math.max(0, Math.round((currentXP / safeRequiredXP) * 100)),
  );
  const xpRemaining = Math.max(0, safeRequiredXP - currentXP);

  const tier = getAvatarTier(level);
  const TierIcon = tier.icon;
  const nameTextSize = getProfileNameTextSize(name);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border bg-[radial-gradient(circle_at_8%_12%,rgba(124,92,252,0.24),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] shadow-elevated">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent-primary/80 to-transparent" />
      <div className="pointer-events-none absolute -left-24 top-4 h-72 w-72 rounded-full bg-accent-primary/20 blur-[110px]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:34px_34px] opacity-35" />

      <div className="relative z-10 grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:items-stretch">
        <div className="grid min-w-0 gap-5 md:grid-cols-[8.5rem_minmax(0,1fr)] md:items-center">
          <div className="relative flex h-32 w-32 items-center justify-center justify-self-center rounded-[2rem] border border-white/10 bg-black/25 shadow-inner-glow md:justify-self-start">
            <div className={`absolute inset-3 rounded-[1.55rem] bg-gradient-to-br ${tier.colors} opacity-30 blur-xl`} />
            <div className={`relative flex h-24 w-24 items-center justify-center rounded-[1.55rem] bg-gradient-to-br ${tier.colors} p-[1px] ${tier.glow}`}>
              <div className="flex h-full w-full items-center justify-center rounded-[1.5rem] border border-border bg-bg-sidebar/95">
                <TierIcon
                  className={`h-11 w-11 ${tier.text} ${tier.animation}`}
                  strokeWidth={1.55}
                />
              </div>
            </div>
            <div className="absolute -bottom-2 flex items-center gap-1 rounded-full border border-accent-primary/30 bg-bg-sidebar px-3 py-1.5 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-accent-primary shadow-card">
              <Star className="h-3 w-3 fill-current" />
              L{level}
            </div>
          </div>

          <div className="min-w-0 text-center md:text-left">
            <div className="mb-3 flex flex-wrap items-center justify-center gap-2 md:justify-start">
              <span className="rounded-lg border border-border bg-black/20 px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">
                Identity core
              </span>
              <span className="rounded-lg border border-accent-primary/25 bg-accent-subtle px-2 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-accent-primary">
                {tier.name}
              </span>
            </div>

            <h2 className={`break-words text-balance font-black leading-none tracking-normal text-text-primary ${nameTextSize}`}>
              {name}
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
              Your current operating identity. Tap this card to inspect the level path and what unlocks next.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <div className="mb-2 flex items-end justify-between gap-4">
                  <div>
                    <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">
                      XP to next level
                    </p>
                    <p className="mt-1 text-sm font-semibold text-text-secondary">
                      {xpRemaining.toLocaleString()} XP remaining
                    </p>
                  </div>
                  <div className="text-right text-3xl font-black leading-none text-text-primary tabular-nums">
                    {xpPercent}%
                  </div>
                </div>
                <ProgressBar value={currentXP} max={safeRequiredXP} size="lg" shimmer />
              </div>
              <div className="rounded-2xl border border-border-subtle bg-black/20 px-3 py-2 text-right font-mono text-[11px] font-bold text-text-muted">
                {currentXP.toLocaleString()} / {safeRequiredXP.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col justify-between gap-3 rounded-[1.5rem] border border-white/10 bg-black/20 p-3 backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3 px-1">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">
                Live signal
              </p>
              <p className="mt-1 text-sm font-bold text-text-primary">Today at a glance</p>
            </div>
            <Orbit className="h-5 w-5 text-accent-primary" />
          </div>

          <div className="grid gap-2">
            <HeaderMetric
              icon={<Flame className="h-3.5 w-3.5" />}
              label="Streak"
              value={`${dailyStreak}`}
              detail={dailyStreak === 1 ? "day" : "days"}
            />
            <HeaderMetric
              icon={<Target className="h-3.5 w-3.5" />}
              label="Quests"
              value={`${questCompletionRate}%`}
              detail="cleared"
            />
            <HeaderMetric
              icon={<Gauge className="h-3.5 w-3.5" />}
              label="Mood"
              value={currentMood?.label ?? "Open"}
              detail={currentMood?.emoji ?? "No check-in"}
            />
          </div>

          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border-subtle bg-bg-panel/50 px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-text-muted transition-colors group-hover:text-accent-primary">
            <span>View level path</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </div>
        </aside>
      </div>
    </section>
  );
}

export default ProfileHeader;
