export type QuestDuration = 'daily' | 'weekly' | 'monthly' | 'yearly';

/**
 * Ordered list of check-in dimension names, corresponding to ratings[0..4].
 * This is the single source of truth that both the questions API and all
 * analytics code must use — never index into ratings positionally without
 * referencing this array.
 */
export const CHECKIN_DIMENSIONS = [
  'energy',
  'focus',
  'stressControl',
  'socialConnection',
  'optimism',
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
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'weekly' || normalized === 'monthly' || normalized === 'yearly') {
    return normalized;
  }

  return 'daily';
}

export function getRequiredXP(level: number): number {
  const normalizedLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
  return 100 + (normalizedLevel - 1) * 25;
}

export function normalizeProgressState(input: Partial<ProgressState> | null | undefined): ProgressState {
  const level = Number.isFinite(input?.level) ? Math.max(1, Math.floor(input?.level as number)) : 1;
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

export function applyXPDelta(input: Partial<ProgressState>, delta: number): ProgressState {
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
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the local-calendar YYYY-MM-DD string for `date` as seen in `timezone`.
 * Falls back to `getDayKey` (server UTC) if the timezone is invalid.
 */
export function getDayKeyTz(date: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);

    const y = parts.find((p) => p.type === 'year')?.value ?? '';
    const m = parts.find((p) => p.type === 'month')?.value ?? '';
    const d = parts.find((p) => p.type === 'day')?.value ?? '';
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

  const uniqueDays = Array.from(new Set(dates.map((date) => getDayKey(new Date(date)))));
  const sortedDays = uniqueDays.sort((a, b) => (a < b ? 1 : -1));

  // If the last activity was not today or yesterday, the streak is broken.
  const todayKey = getDayKey(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = getDayKey(yesterdayDate);

  if (sortedDays[0] !== todayKey && sortedDays[0] !== yesterdayKey) {
    return 0;
  }

  let streak = 1;
  for (let index = 1; index < sortedDays.length; index += 1) {
    const previous = new Date(`${sortedDays[index - 1]}T00:00:00`);
    const current = new Date(`${sortedDays[index]}T00:00:00`);
    const diffDays = Math.round((previous.getTime() - current.getTime()) / 86400000);

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

  if (context.totalQuests >= 1) badges.add('First Quest');
  if (context.completedQuests >= 7) badges.add('Week Warrior');
  if (context.level >= 10) badges.add('Level 10');
  if (context.streak >= 30) badges.add('Streak Master');
  if (context.checkInCount >= 10) badges.add('Mindful');
  if (context.hasEarlyCheckIn) badges.add('Early Bird');
  if ((context.weekendQuestCount || 0) >= 1) badges.add('Weekend Warrior');
  if ((context.lateNightCheckInCount || 0) >= 1) badges.add('Night Owl');

  return Array.from(badges);
}

export function getMoodFromCheckIn(overallScore: number, maxScore = 25): MoodSnapshot {
  if (!maxScore) {
    return { emoji: '😐', label: 'Neutral' };
  }

  const percentage = Math.round((overallScore / maxScore) * 100);

  if (percentage >= 80) return { emoji: '🤩', label: 'Excellent' };
  if (percentage >= 60) return { emoji: '😄', label: 'Great' };
  if (percentage >= 40) return { emoji: '🙂', label: 'Good' };
  if (percentage >= 20) return { emoji: '😐', label: 'Neutral' };
  return { emoji: '😟', label: 'Low' };
}
