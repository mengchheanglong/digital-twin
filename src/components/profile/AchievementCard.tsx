"use client";

import React from "react";
import { Lock } from "lucide-react";

export interface AchievementCardProps {
  id: string;
  icon: string | React.ReactNode;
  title: string;
  description: string;
  isUnlocked: boolean;
  progress?: {
    current: number;
    target: number;
  };
  unlockedAt?: string;
  colorClass?: string;
}

/**
 * AchievementCard - Displays badges/achievements with optional progress
 * Can be in unlocked or locked state with different styling
 */
export function AchievementCard({
  icon,
  title,
  description,
  isUnlocked,
  progress,
  unlockedAt,
  colorClass,
}: AchievementCardProps) {
  const progressPercent = progress
    ? Math.round((progress.current / progress.target) * 100)
    : 0;
  const compactIcon = typeof icon === "string" && icon.length > 2;

  return (
    <div
      className={`
        group relative flex items-start gap-4 rounded-2xl p-5
        transition-all duration-500 ease-apple backdrop-blur-xl overflow-hidden shadow-card
        ${isUnlocked
          ? "border border-border bg-bg-card/80 hover:border-accent-primary/40 hover:shadow-elevated hover:-translate-y-1"
          : "border border-dashed border-border-subtle bg-bg-panel/30 opacity-70 hover:opacity-100 hover:border-border hover:shadow-card hover:-translate-y-0.5"
        }
      `}
    >
      {/* Ambient glass glow */}
      {isUnlocked && (
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-accent-primary/10 blur-[50px] opacity-0 transition-all duration-700 ease-apple group-hover:opacity-60" />
      )}

      {/* Badge Icon */}
      <div
        className={`
          relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full shadow-inner ring-1 ring-border
          transition-transform duration-500 ease-spring group-hover:scale-110 group-hover:rotate-6
          ${isUnlocked
            ? colorClass || "surface-accent"
            : "bg-bg-base text-text-muted grayscale"
          }
        `}
      >
        {typeof icon === "string" ? (
          <span className={compactIcon ? "text-[11px] font-bold tracking-wide" : "text-base font-bold"}>
            {icon}
          </span>
        ) : (
          icon
        )}
        {!isUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-bg-base/60">
            <Lock className="h-4 w-4 text-text-muted" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1">
        {/* Title */}
        <h3 className={`font-semibold ${isUnlocked ? "text-text-primary" : "text-text-secondary"}`}>
          {title}
        </h3>

        {/* Description */}
        <p className="text-sm text-text-secondary">{description}</p>

        {/* Progress Bar (when applicable) */}
        {progress && (
          <div className="mt-2">
            <div className="mb-1 flex justify-between text-xs text-text-muted">
              <span>Progress</span>
              <span>{progress.current} / {progress.target}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-input ring-1 ring-border/50">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-hover transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Unlocked Date */}
        {isUnlocked && unlockedAt && (
          <p className="mt-1 text-xs text-text-muted">
            Unlocked {new Date(unlockedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}

export default AchievementCard;
