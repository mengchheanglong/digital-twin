"use client";

import { AVATAR_TIERS, getAvatarTier } from "@/lib/progression";
import { Lock, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui";

export interface ProgressionShowcaseProps {
  currentLevel: number;
}

export function ProgressionShowcase({
  currentLevel,
}: ProgressionShowcaseProps) {
  const currentTier = getAvatarTier(currentLevel);
  const nextTierIndex = AVATAR_TIERS.findIndex((t) => t.level > currentLevel);
  const nextTier = nextTierIndex !== -1 ? AVATAR_TIERS[nextTierIndex] : null;

  return (
    <Card variant="elevated" className="relative overflow-hidden">
      {/* Background ambient glows — match current tier color */}
      <div
        className={`pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br ${currentTier.colors} opacity-[0.06] blur-[90px]`}
      />
      <div
        className={`pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-gradient-to-tr ${currentTier.colors} opacity-[0.04] blur-[70px]`}
      />

      {/* Top accent bar — tier-colored gradient */}
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-60 ${currentTier.text}`}
      />

      <div className="relative z-10 p-6 pb-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary tracking-tight">
              Path of Ascension
            </h2>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-text-secondary">
              Six stages of growth — each one a deeper expression of your
              digital twin.
            </p>
          </div>

          {/* Current tier badge */}
          <div
            className={`shrink-0 flex items-center gap-2 rounded-2xl border px-4 py-2.5 ${currentTier.bg} ${currentTier.border}`}
          >
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${currentTier.colors}`}
            >
              {(() => {
                const Icon = currentTier.icon;
                return (
                  <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2} />
                );
              })()}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted leading-none mb-0.5">
                Current Stage
              </p>
              <p
                className={`text-sm font-black leading-none ${currentTier.text}`}
              >
                {currentTier.name}
              </p>
            </div>
          </div>
        </div>

        {/* Tier grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AVATAR_TIERS.map((tier, index) => {
            const unlocked = currentLevel >= tier.level;
            const isCurrent = currentTier.level === tier.level;
            const Icon = tier.icon;
            const isNext = nextTier?.level === tier.level;

            return (
              <div
                key={tier.level}
                title={tier.description}
                className={[
                  "group relative flex items-center gap-4 overflow-hidden rounded-2xl border p-4 transition-all duration-300 ease-apple",
                  isCurrent
                    ? `${tier.bg} ${tier.border} shadow-md`
                    : unlocked
                      ? "border-border-subtle bg-bg-panel/40 hover:bg-bg-panel/80 hover:border-border hover:-translate-y-0.5 hover:shadow-card"
                      : "border-dashed border-border-subtle bg-bg-panel/20 opacity-60 hover:opacity-80",
                ].join(" ")}
              >
                {/* Ambient glow on hover for current */}
                {isCurrent && (
                  <div
                    className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${tier.colors} opacity-20 blur-2xl`}
                  />
                )}

                {/* Avatar icon ring */}
                <div className="relative shrink-0">
                  {/* Outer pulse ring for current tier */}
                  {isCurrent && (
                    <span
                      className={`absolute inset-0 rounded-full animate-animal-pulse opacity-30 bg-gradient-to-br ${tier.colors}`}
                    />
                  )}

                  <div
                    className={[
                      "relative flex h-14 w-14 items-center justify-center rounded-full transition-all duration-500 ease-apple",
                      unlocked
                        ? `bg-gradient-to-br ${tier.colors} p-[2.5px] ${isCurrent ? `${tier.glow} scale-105` : "group-hover:scale-105"}`
                        : "bg-bg-panel ring-1 ring-border",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "flex h-full w-full items-center justify-center rounded-full",
                        unlocked ? "bg-bg-card" : "bg-bg-base",
                      ].join(" ")}
                    >
                      {unlocked ? (
                        <Icon
                          className={[
                            "transition-all duration-300",
                            isCurrent
                              ? `h-7 w-7 ${tier.text} ${tier.animation}`
                              : `h-6 w-6 ${tier.text}`,
                          ].join(" ")}
                          strokeWidth={isCurrent ? 1.8 : 2}
                        />
                      ) : (
                        <Lock
                          className="h-5 w-5 text-text-muted/60"
                          strokeWidth={1.5}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Text content */}
                <div className="relative z-10 flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3
                      className={[
                        "text-sm font-bold leading-tight transition-colors duration-300",
                        isCurrent
                          ? tier.text
                          : unlocked
                            ? "text-text-primary"
                            : "text-text-muted",
                      ].join(" ")}
                    >
                      {tier.name}
                    </h3>

                    {isCurrent && (
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest ${tier.bg} ${tier.text} ring-1 ${tier.border}`}
                      >
                        You
                      </span>
                    )}
                    {isNext && !isCurrent && (
                      <span className="inline-flex items-center rounded-full border border-text-muted/20 bg-bg-hover px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-text-muted">
                        Next
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] font-semibold text-text-muted leading-snug line-clamp-2">
                    {tier.description}
                  </p>

                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      className={[
                        "text-[10px] font-bold uppercase tracking-wider",
                        unlocked
                          ? isCurrent
                            ? tier.text
                            : "text-status-success"
                          : "text-text-muted/60",
                      ].join(" ")}
                    >
                      {unlocked
                        ? isCurrent
                          ? "★ Active"
                          : "✓ Unlocked"
                        : `Lvl ${tier.level}`}
                    </span>
                  </div>
                </div>

                {/* Next tier chevron hint */}
                {isNext && (
                  <ChevronRight className="h-4 w-4 shrink-0 text-text-muted/40 group-hover:text-text-muted transition-colors" />
                )}
              </div>
            );
          })}
        </div>

        {/* Next tier progress hint */}
        {nextTier && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-border-subtle bg-bg-panel/40 px-4 py-3">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${nextTier.colors} opacity-60`}
            >
              {(() => {
                const NextIcon = nextTier.icon;
                return (
                  <NextIcon className="h-4 w-4 text-white" strokeWidth={2} />
                );
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-text-secondary">
                <span className="text-text-primary font-bold">
                  {nextTier.name}
                </span>{" "}
                unlocks at Level {nextTier.level}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5 truncate">
                {nextTier.description}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs font-black text-text-muted tabular-nums">
                {Math.max(0, nextTier.level - currentLevel)}
              </p>
              <p className="text-[10px] text-text-muted/70 uppercase tracking-wide">
                lvls away
              </p>
            </div>
          </div>
        )}

        {/* Max tier celebration */}
        {!nextTier && (
          <div
            className={`mt-6 flex items-center gap-3 rounded-2xl border px-4 py-3 ${currentTier.bg} ${currentTier.border}`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${currentTier.colors}`}
            >
              {(() => {
                const CurIcon = currentTier.icon;
                return (
                  <CurIcon className="h-4 w-4 text-white" strokeWidth={2} />
                );
              })()}
            </div>
            <p className={`text-sm font-bold ${currentTier.text}`}>
              You&apos;ve reached the pinnacle of ascension. The twin is fully
              realized.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

export default ProgressionShowcase;
