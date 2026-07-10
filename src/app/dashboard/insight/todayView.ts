import type { MobileToday } from "@/lib/mobile-today";

export function getXpPercent(currentXP: number, requiredXP: number): number {
  if (!Number.isFinite(currentXP) || !Number.isFinite(requiredXP) || requiredXP <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((currentXP / requiredXP) * 100)));
}

export function getTodayHeadline(today: MobileToday): string {
  if (!today.checkIn.completedToday) {
    return "Take your daily pulse";
  }

  if (today.quest.current) {
    return "Keep your momentum moving";
  }

  return "Close the loop with reflection";
}

export function getTrendLabel(trend: MobileToday["insight"]["trend"]): string {
  if (trend === "rising") return "Rising";
  if (trend === "dropping") return "Needs care";
  return "Stable";
}

