import { Flame, Compass, Zap, Shield, Sparkles, Crown } from "lucide-react";

export type QuestDuration = "daily" | "weekly" | "monthly" | "yearly";

/**
 * Ordered list of check-in dimension names, corresponding to ratings[0..4].
 * This is the single source of truth that both the questions API and all
 * analytics code must use — never index into ratings positionally without
 * referencing this array.
 */
export const CHECKIN_DIMENSIONS = [
  "energy",
  "focus",
  "stressControl",
  "socialConnection",
  "optimism",
] as const;

export type CheckInDimensionName = (typeof CHECKIN_DIMENSIONS)[number];

export interface ProgressState {
  level: number;
  currentXP: number;
  requiredXP: number;
}

export interface MoodSnapshot {
  emoji: string;
  label: string;
}

export const QUEST_XP_REWARD: Record<QuestDuration, number> = {
  daily: 20,
  weekly: 50,
  monthly: 150,
  yearly: 500,
};

export function normalizeDuration(value: string): QuestDuration {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (
    normalized === "weekly" ||
    normalized === "monthly" ||
    normalized === "yearly"
  ) {
    return normalized;
  }

  return "daily";
}

export function getRequiredXP(level: number): number {
  const normalizedLevel = Number.isFinite(level)
    ? Math.max(1, Math.floor(level))
    : 1;
  return 100 + (normalizedLevel - 1) * 25;
}

export function normalizeProgressState(
  input: Partial<ProgressState> | null | undefined,
): ProgressState {
  const level = Number.isFinite(input?.level)
    ? Math.max(1, Math.floor(input?.level as number))
    : 1;
  const requiredXP = Number.isFinite(input?.requiredXP)
    ? Math.max(100, Math.floor(input?.requiredXP as number))
    : getRequiredXP(level);
  const currentXP = Number.isFinite(input?.currentXP)
    ? Math.max(0, Math.floor(input?.currentXP as number))
    : 0;

  return {
    level,
    requiredXP,
    currentXP: Math.min(currentXP, requiredXP),
  };
}

export function applyXPDelta(
  input: Partial<ProgressState>,
  delta: number,
): ProgressState {
  let state = normalizeProgressState(input);
  let currentXP = state.currentXP + Math.floor(delta || 0);
  let level = state.level;
  let requiredXP = state.requiredXP;

  while (currentXP >= requiredXP) {
    currentXP -= requiredXP;
    level += 1;
    requiredXP = getRequiredXP(level);
  }

  while (currentXP < 0 && level > 1) {
    level -= 1;
    requiredXP = getRequiredXP(level);
    currentXP += requiredXP;
  }

  if (currentXP < 0) {
    currentXP = 0;
  }

  return {
    level,
    requiredXP,
    currentXP,
  };
}

export function getDayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalMidnightTime(date: Date): number {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.getTime();
}

const tzFormatterCache = new Map<string, Intl.DateTimeFormat>();

/**
 * Returns the day of the week (0-6, where 0 is Sunday) for a YYYY-MM-DD dayKey.
 * Uses Sakamoto's algorithm for high-performance deterministic calculation
 * without Date object overhead or timezone ambiguity.
 */
export function getUTCDayFromDayKey(dayKey: string): number {
  if (!dayKey || dayKey.length < 10) return 0;

  // Fast extraction of Y, M, D
  let y = parseInt(dayKey.substring(0, 4), 10);
  const m = parseInt(dayKey.substring(5, 7), 10);
  const d = parseInt(dayKey.substring(8, 10), 10);

  if (isNaN(y) || isNaN(m) || isNaN(d)) return 0;

  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  if (m < 3) y -= 1;
  return (
    (y +
      Math.floor(y / 4) -
      Math.floor(y / 100) +
      Math.floor(y / 400) +
      t[m - 1] +
      d) %
    7
  );
}

/**
 * Returns the local-calendar YYYY-MM-DD string for `date` as seen in `timezone`.
 * Falls back to `getDayKey` (server UTC) if the timezone is invalid.
 */
export function getDayKeyTz(date: Date, timezone: string): string {
  try {
    let formatter = tzFormatterCache.get(timezone);
    if (!formatter) {
      formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      tzFormatterCache.set(timezone, formatter);
    }

    const parts = formatter.formatToParts(date);
    let y = "";
    let m = "";
    let d = "";

    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (p.type === "year") y = p.value;
      else if (p.type === "month") m = p.value;
      else if (p.type === "day") d = p.value;
    }

    if (y && m && d) {
      return `${y}-${m}-${d}`;
    }
  } catch {
    // Fall through to UTC fallback
  }
  return getDayKey(date);
}

export function computeDailyStreak(dates: Date[]): number {
  if (!dates.length) return 0;

  const uniqueDays = Array.from(
    new Set(dates.map((date) => getLocalMidnightTime(new Date(date)))),
  );
  const sortedDays = uniqueDays.sort((a, b) => b - a);

  // If the last activity was not today or yesterday, the streak is broken.
  const todayKey = getLocalMidnightTime(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = getLocalMidnightTime(yesterdayDate);

  if (sortedDays[0] !== todayKey && sortedDays[0] !== yesterdayKey) {
    return 0;
  }

  let streak = 1;
  for (let index = 1; index < sortedDays.length; index += 1) {
    const diffDays = Math.round(
      (sortedDays[index - 1] - sortedDays[index]) / 86400000,
    );

    if (diffDays !== 1) {
      break;
    }

    streak += 1;
  }

  return streak;
}

export interface BadgeContext {
  totalQuests: number;
  completedQuests: number;
  checkInCount: number;
  streak: number;
  level: number;
  hasEarlyCheckIn: boolean;
  existingBadges?: string[];
  weekendQuestCount?: number;
  lateNightCheckInCount?: number;
}

export function deriveBadges(context: BadgeContext): string[] {
  const badges = new Set(context.existingBadges || []);

  if (context.totalQuests >= 1) badges.add("First Quest");
  if (context.completedQuests >= 7) badges.add("Week Warrior");
  if (context.level >= 10) badges.add("Level 10");
  if (context.streak >= 30) badges.add("Streak Master");
  if (context.checkInCount >= 10) badges.add("Mindful");
  if (context.hasEarlyCheckIn) badges.add("Early Bird");
  if ((context.weekendQuestCount || 0) >= 1) badges.add("Weekend Warrior");
  if ((context.lateNightCheckInCount || 0) >= 1) badges.add("Night Owl");

  return Array.from(badges);
}

export function getMoodFromCheckIn(
  overallScore: number,
  maxScore = 25,
): MoodSnapshot {
  if (!maxScore) {
    return { emoji: "😐", label: "Neutral" };
  }

  const percentage = Math.round((overallScore / maxScore) * 100);

  if (percentage >= 80) return { emoji: "🤩", label: "Excellent" };
  if (percentage >= 60) return { emoji: "😄", label: "Great" };
  if (percentage >= 40) return { emoji: "🙂", label: "Good" };
  if (percentage >= 20) return { emoji: "😐", label: "Neutral" };
  return { emoji: "😟", label: "Low" };
}

/**
 * Avatar progression tiers — six stages of personal evolution.
 *
 * Narrative arc:
 *   Ember  → Seeker  → Surge  → Forged  → Luminary  → Sovereign
 *
 * Each stage has a distinct color palette, icon, glow, and animation
 * that evolves from humble beginnings to transcendent mastery.
 */
export const AVATAR_TIERS = [
  {
    level: 1,
    name: "Ember",
    description: "A faint spark of potential, quietly waiting to ignite.",
    icon: Flame,
    colors: "from-zinc-400 to-slate-500",
    bg: "bg-slate-500/10",
    border: "border-slate-500/30",
    glow: "shadow-[0_0_18px_rgba(100,116,139,0.25)]",
    text: "text-slate-400",
    animation: "animate-animal-pulse",
  },
  {
    level: 5,
    name: "Seeker",
    description: "Compass in hand, mapping the uncharted terrain of the self.",
    icon: Compass,
    colors: "from-sky-400 to-cyan-500",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    glow: "shadow-[0_0_22px_rgba(56,189,248,0.35)]",
    text: "text-sky-400",
    animation: "animate-animal-slide",
  },
  {
    level: 15,
    name: "Surge",
    description: "Electric momentum — energy multiplying with every step.",
    icon: Zap,
    colors: "from-violet-400 to-purple-600",
    bg: "bg-violet-500/10",
    border: "border-violet-500/40",
    glow: "shadow-[0_0_28px_rgba(167,139,250,0.45)]",
    text: "text-violet-400",
    animation: "animate-animal-wiggle",
  },
  {
    level: 30,
    name: "Forged",
    description: "Tested by fire, obstacles only made you stronger.",
    icon: Shield,
    colors: "from-orange-400 to-rose-600",
    bg: "bg-orange-500/10",
    border: "border-orange-500/40",
    glow: "shadow-[0_0_32px_rgba(251,146,60,0.5)]",
    text: "text-orange-400",
    animation: "animate-animal-hop",
  },
  {
    level: 50,
    name: "Luminary",
    description: "Radiant with earned wisdom — a light that guides others.",
    icon: Sparkles,
    colors: "from-amber-300 to-yellow-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/50",
    glow: "shadow-[0_0_36px_rgba(251,191,36,0.55)]",
    text: "text-amber-300",
    animation: "animate-animal-float",
  },
  {
    level: 100,
    name: "Sovereign",
    description: "The digital twin fully realized — absolute mastery of self.",
    icon: Crown,
    colors: "from-emerald-400 via-teal-300 to-violet-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/50",
    glow: "shadow-[0_0_42px_rgba(52,211,153,0.6)]",
    text: "text-emerald-300",
    animation: "animate-animal-fly",
  },
];

export type AvatarTier = (typeof AVATAR_TIERS)[number];

export function getAvatarTier(level: number): AvatarTier {
  return (
    [...AVATAR_TIERS].reverse().find((tier) => level >= tier.level) ||
    AVATAR_TIERS[0]
  );
}
