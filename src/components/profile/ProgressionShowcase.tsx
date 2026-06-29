"use client";

import { useRef, useState } from "react";
import { AVATAR_TIERS, getAvatarTier } from "@/lib/progression";
import { Check, Lock } from "lucide-react";
import { Card } from "@/components/ui";

export interface ProgressionShowcaseProps {
  currentLevel: number;
}

const SWIPE_THRESHOLD_PX = 48;

export function ProgressionShowcase({ currentLevel }: ProgressionShowcaseProps) {
  const currentTier = getAvatarTier(currentLevel);
  const currentTierIndex = Math.max(
    0,
    AVATAR_TIERS.findIndex((tier) => tier.level === currentTier.level),
  );
  const [selectedIndex, setSelectedIndex] = useState(currentTierIndex);
  const selectedTier = AVATAR_TIERS[selectedIndex] ?? currentTier;
  const selectedUnlocked = currentLevel >= selectedTier.level;
  const selectedIsCurrent = selectedTier.level === currentTier.level;
  const SelectedIcon = selectedTier.icon;
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const moveTier = (direction: -1 | 1) => {
    setSelectedIndex((index) =>
      Math.min(Math.max(index + direction, 0), AVATAR_TIERS.length - 1),
    );
  };

  const handlePointerUp = (clientX: number, clientY: number) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start) return;

    const deltaX = clientX - start.x;
    const deltaY = clientY - start.y;
    if (
      Math.abs(deltaX) < SWIPE_THRESHOLD_PX ||
      Math.abs(deltaX) <= Math.abs(deltaY)
    ) {
      return;
    }

    moveTier(deltaX < 0 ? 1 : -1);
  };

  return (
    <Card variant="elevated" className="relative overflow-hidden">
      <div
        className={`pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br ${selectedTier.colors} opacity-10 blur-[80px]`}
      />
      <div
        className={`absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-60 ${selectedTier.text}`}
      />

      <div className="relative z-10 space-y-5 p-4 sm:p-6">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight text-text-primary">
            Path of Ascension
          </h2>
          <p className="text-sm text-text-secondary">
            Move left or right to view each level.
          </p>
        </div>

        <div
          role="slider"
          tabIndex={0}
          aria-label="Path of Ascension level"
          aria-valuemin={AVATAR_TIERS[0]?.level ?? 1}
          aria-valuemax={AVATAR_TIERS[AVATAR_TIERS.length - 1]?.level ?? 1}
          aria-valuenow={selectedTier.level}
          aria-valuetext={`${selectedTier.name}, level ${selectedTier.level}`}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              moveTier(-1);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              moveTier(1);
            }
          }}
          onPointerDown={(event) => {
            if (!event.isPrimary) return;
            pointerStartRef.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={(event) => {
            if (!event.isPrimary) return;
            handlePointerUp(event.clientX, event.clientY);
          }}
          onPointerCancel={() => {
            pointerStartRef.current = null;
          }}
          className={`rounded-3xl border p-5 focus-ring [touch-action:pan-y] ${selectedTier.bg} ${selectedTier.border}`}
        >
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <div
              className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${selectedTier.colors} p-[3px] ${selectedUnlocked ? selectedTier.glow : "opacity-70"}`}
            >
              <div className="flex h-full w-full items-center justify-center rounded-full bg-bg-card">
                {selectedUnlocked ? (
                  <SelectedIcon
                    className={`h-10 w-10 ${selectedTier.text} ${selectedIsCurrent ? selectedTier.animation : ""}`}
                    strokeWidth={1.8}
                  />
                ) : (
                  <Lock className="h-8 w-8 text-text-muted/70" strokeWidth={1.5} />
                )}
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h3 className={`text-2xl font-black ${selectedTier.text}`}>
                  {selectedTier.name}
                </h3>
                <span className="rounded-full border border-border bg-bg-card/70 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-text-muted">
                  Level {selectedTier.level}
                </span>
              </div>

              <p className="break-words text-sm leading-relaxed text-text-secondary [overflow-wrap:anywhere]">
                {selectedTier.description}
              </p>

              <div className="flex justify-center sm:justify-start">
                <span
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold",
                    selectedIsCurrent
                      ? `${selectedTier.bg} ${selectedTier.text} ring-1 ${selectedTier.border}`
                      : selectedUnlocked
                        ? "bg-status-success/10 text-status-success ring-1 ring-status-success/20"
                        : "bg-bg-hover text-text-muted ring-1 ring-border",
                  ].join(" ")}
                >
                  {selectedUnlocked ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Lock className="h-3 w-3" />
                  )}
                  {selectedIsCurrent
                    ? "Current level"
                    : selectedUnlocked
                      ? "Unlocked"
                      : "Locked"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="flex min-w-0 items-center justify-center gap-2">
            {AVATAR_TIERS.map((tier, index) => {
              const isSelected = selectedIndex === index;
              const unlocked = currentLevel >= tier.level;
              return (
                <button
                  key={tier.level}
                  type="button"
                  onClick={() => setSelectedIndex(index)}
                  className={[
                    "h-2.5 rounded-full transition-all focus-ring",
                    isSelected
                      ? "w-8 bg-accent-primary"
                      : unlocked
                        ? "w-2.5 bg-text-muted/60"
                        : "w-2.5 bg-border",
                  ].join(" ")}
                  aria-label={`View ${tier.name}, level ${tier.level}`}
                  aria-pressed={isSelected}
                />
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default ProgressionShowcase;
