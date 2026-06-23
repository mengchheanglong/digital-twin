"use client";

import { AVATAR_TIERS, getAvatarTier } from "@/lib/progression";
import { Lock } from "lucide-react";
import { Card } from "@/components/ui";

export interface ProgressionShowcaseProps {
  currentLevel: number;
}

export function ProgressionShowcase({ currentLevel }: ProgressionShowcaseProps) {
  const currentTier = getAvatarTier(currentLevel);

  return (
    <Card variant="elevated" className="relative overflow-hidden p-6">
      {/* Glow behind */}
      <div
        className={`absolute right-0 top-0 h-full w-1/2 rounded-full bg-gradient-to-l ${currentTier.colors} opacity-5 blur-[100px] pointer-events-none`}
      />

      <div className="relative z-10 mb-8">
        <h2 className="text-xl font-bold text-text-primary">Path of Progression</h2>
        <p className="mt-1 max-w-lg text-sm leading-relaxed text-text-secondary">
          Unlock spectacular new avatar visual forms and aesthetics as you level up your digital twin.
        </p>
      </div>

      {/* Horizontal journey */}
      <div className="relative z-10">
        <div className="grid gap-6 sm:grid-cols-3 lg:grid-cols-6">
          {AVATAR_TIERS.map((tier, index) => {
            const unlocked = currentLevel >= tier.level;
            const Icon = tier.icon;
            const isCurrent = currentTier.level === tier.level;
            return (
              <div key={tier.level} className="relative flex flex-col items-center">
                {/* Node */}
                <div
                  className={`
                    relative z-10 flex h-16 w-16 items-center justify-center rounded-full transition-all duration-500 ease-apple
                    ${unlocked
                      ? `bg-gradient-to-br ${tier.colors} p-[2px] ${isCurrent ? tier.glow : ""}`
                      : "bg-bg-panel ring-1 ring-border"
                    }
                  `}
                >
                  <div
                    className={`
                      flex h-full w-full items-center justify-center rounded-full
                      ${unlocked ? "bg-bg-card" : "bg-bg-base"}
                    `}
                  >
                    <Icon
                      className={`
                        h-7 w-7 transition-colors duration-300 ease-apple
                        ${unlocked ? `${tier.text} ${isCurrent ? tier.animation : ""}` : "text-text-muted"}
                      `}
                      strokeWidth={unlocked ? 2 : 1.5}
                    />
                  </div>

                  {/* Current pulse ring */}
                  {isCurrent && (
                    <span className="absolute inset-0 rounded-full animate-animal-pulse bg-accent-primary/20" />
                  )}
                </div>

                {/* Status badge */}
                <div className="mt-3 flex h-5 items-center">
                  {!unlocked && (
                    <Lock className="h-3 w-3 text-text-muted" />
                  )}
                  {unlocked && isCurrent && (
                    <span className="rounded-full bg-accent-subtle px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-primary ring-1 ring-accent-primary/20">
                      Current
                    </span>
                  )}
                  {unlocked && !isCurrent && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-status-success">
                      Unlocked
                    </span>
                  )}
                </div>

                {/* Labels */}
                <div className="mt-1 text-center">
                  <h3
                    className={`
                      text-sm font-bold transition-colors duration-300 ease-apple
                      ${isCurrent ? "text-accent-primary" : unlocked ? "text-text-primary" : "text-text-muted"}
                    `}
                  >
                    {tier.name}
                  </h3>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Lvl {tier.level}
                  </p>
                </div>

                {/* Connector dot for active path on desktop */}
                {unlocked && index < AVATAR_TIERS.length - 1 && (
                  <div className="pointer-events-none absolute left-1/2 top-8 hidden h-0.5 w-[calc(100%+1.5rem)] -translate-x-1/2 lg:block">
                    <div className="h-full w-full bg-gradient-to-r from-accent-primary/40 to-transparent" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

export default ProgressionShowcase;
