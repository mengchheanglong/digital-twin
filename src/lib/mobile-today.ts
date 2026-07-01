import { getMoodFromCheckIn, getDayKey, getDayKeyTz, CHECKIN_DIMENSIONS, computeDailyStreak } from '@/lib/progression';
import { clampNumber, sanitizeText } from '@/lib/twin-core/sanitize';
import User from '@/lib/models/User';
import CheckIn from '@/lib/models/CheckIn';
import Quest from '@/lib/models/Quest';
import UserInsightState from '@/lib/models/UserInsightState';

export interface MobileTodayDimensionMap {
  energy: number;
  focus: number;
  stressControl: number;
  socialConnection: number;
  optimism: number;
}

export interface MobileToday {
  version: 'mobile-today.v0';
  generatedAt: string;
  dayKey: string;
  user: {
    name: string;
    level: number;
    currentXP: number;
    requiredXP: number;
    streak: number;
    mood: {
      emoji: string;
      label: string;
    };
  };
  checkIn: {
    completedToday: boolean;
    score: number | null;
    dimensions: MobileTodayDimensionMap | null;
  };
  quest: {
    current: {
      goal: string;
      duration: string;
      progress: number;
    } | null;
    nextAction: {
      label: string;
      href: string;
      reason: string;
    };
  };
  insight: {
    trend: 'rising' | 'stable' | 'dropping';
    topInterest: string;
    productivityScore: number;
    entertainmentRatio: number;
    reflection: string;
  };
  launcher: {
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  };
}

export interface BuildMobileTodayOptions {
  now?: Date;
}

type PlainRecord = Record<string, unknown>;

const MOBILE_REFLECTION_SOURCE_MAX_LENGTH = 360;
const MOBILE_REFLECTION_TARGET_MAX_LENGTH = 220;
const MOBILE_REFLECTION_MIN_SENTENCE_LENGTH = 80;

function asRecord(value: unknown): PlainRecord {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as PlainRecord;
  }
  return {};
}

function isValidTrend(value: unknown): value is 'rising' | 'stable' | 'dropping' {
  return value === 'rising' || value === 'stable' || value === 'dropping';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clampPercent(value: unknown, fallback = 0): number {
  return clampNumber(value, 0, 100, fallback);
}

function extractDayKey(entry: PlainRecord, timezone: string, now: Date): string {
  const rawDayKey = sanitizeText(entry.dayKey, 16);
  if (rawDayKey) return rawDayKey;

  const rawDate = entry.date as unknown;
  if (rawDate instanceof Date && Number.isFinite(rawDate.getTime())) {
    return getDayKeyTz(rawDate, timezone);
  }
  if (typeof rawDate === 'string' || typeof rawDate === 'number') {
    const parsed = new Date(rawDate);
    if (Number.isFinite(parsed.getTime())) {
      return getDayKeyTz(parsed, timezone);
    }
  }

  return getDayKey(now);
}

function sanitizeString(value: unknown, maxLength = 100): string {
  return sanitizeText(value, maxLength);
}

function clampToCompleteSentence(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;

  const clipped = value.slice(0, maxLength).trimEnd();
  const sentenceEnd = Math.max(
    clipped.lastIndexOf('.'),
    clipped.lastIndexOf('!'),
    clipped.lastIndexOf('?'),
  );
  if (sentenceEnd >= MOBILE_REFLECTION_MIN_SENTENCE_LENGTH) {
    return clipped.slice(0, sentenceEnd + 1);
  }

  const wordBoundary = clipped.lastIndexOf(' ');
  const fallbackEnd = wordBoundary >= MOBILE_REFLECTION_MIN_SENTENCE_LENGTH
    ? wordBoundary
    : maxLength;
  return `${clipped.slice(0, fallbackEnd).trimEnd()}...`;
}

function sanitizeReflection(value: unknown): string {
  const sanitized = sanitizeString(value, MOBILE_REFLECTION_SOURCE_MAX_LENGTH);
  if (!sanitized) return '';
  return clampToCompleteSentence(sanitized, MOBILE_REFLECTION_TARGET_MAX_LENGTH);
}

function parseRatingArray(raw: unknown): MobileTodayDimensionMap | null {
  if (!Array.isArray(raw) || raw.length !== CHECKIN_DIMENSIONS.length) return null;

  const dims: Partial<MobileTodayDimensionMap> = {};
  for (let i = 0; i < CHECKIN_DIMENSIONS.length; i += 1) {
    const key = CHECKIN_DIMENSIONS[i];
    const rawValue = raw[i];
    if (!isNumber(rawValue)) return null;
    if (rawValue < 1 || rawValue > 5) return null;

    dims[key] = rawValue;
  }

  return {
    energy: dims.energy ?? 0,
    focus: dims.focus ?? 0,
    stressControl: dims.stressControl ?? 0,
    socialConnection: dims.socialConnection ?? 0,
    optimism: dims.optimism ?? 0,
  };
}

function sanitizeQuestDuration(value: unknown): string {
  const normalized = sanitizeString(value, 24).toLowerCase();
  if (normalized === 'weekly' || normalized === 'monthly' || normalized === 'yearly' || normalized === 'daily') {
    return normalized;
  }
  return 'daily';
}

function resolveProgress(raw: unknown, fallback: number): number {
  return clampNumber(raw, 0, 100, fallback);
}

function computeLauncherState(input: {
  hasCheckIn: boolean;
  quest: MobileToday['quest']['current'];
}): {
  launcher: MobileToday['launcher'];
  nextAction: MobileToday['quest']['nextAction'];
} {
  if (!input.hasCheckIn) {
    const reason = 'Complete your daily check-in to unlock your next action.';
    return {
      launcher: {
        primaryLabel: 'Check in',
        primaryHref: '/dashboard/checkin',
        secondaryLabel: 'Continue quest',
        secondaryHref: '/dashboard/quest',
      },
      nextAction: {
        label: 'Check in',
        href: '/dashboard/checkin',
        reason,
      },
    };
  }

  if (input.quest) {
    const reason = 'Resume your active quest to keep momentum.';
    return {
      launcher: {
        primaryLabel: 'Continue quest',
        primaryHref: '/dashboard/quest',
        secondaryLabel: 'Reflect',
        secondaryHref: '/dashboard/chat',
      },
      nextAction: {
        label: 'Continue quest',
        href: '/dashboard/quest',
        reason,
      },
    };
  }

  const reason = 'Reflect on today and choose your next focused action.';
  return {
    launcher: {
      primaryLabel: 'Reflect',
      primaryHref: '/dashboard/chat',
      secondaryLabel: 'Create quest',
      secondaryHref: '/dashboard/quest',
    },
    nextAction: {
      label: 'Reflect',
      href: '/dashboard/chat',
      reason,
    },
  };
}

function toCheckInScore(value: unknown): number | null {
  if (isNumber(value)) {
    return clampPercent(value, 0);
  }
  return null;
}

function clampReflectionScore(value: unknown): number {
  return clampPercent(value, 0);
}

function clampEntertainmentRatio(value: unknown): number {
  return clampNumber(value, 0, 1, 0);
}

export async function buildMobileToday(
  userId: string,
  options: BuildMobileTodayOptions = {},
): Promise<MobileToday> {
  const now = options.now || new Date();

  const [rawUserDoc, rawCheckIns, rawActiveQuests, rawInsightDoc] = await Promise.all([
    User.findById(userId)
      .select('name level currentXP requiredXP timezone')
      .lean(),
    CheckIn.find({
      userId,
      checkInType: { $ne: 'micro' },
    })
      .sort({ date: -1 })
      .limit(180)
      .lean(),
    Quest.find({
      userId,
      completed: false,
    })
      .sort({ date: -1 })
      .limit(1)
      .lean(),
    UserInsightState.findOne({ userId })
      .select('currentTrend topInterest productivityScore entertainmentRatio lastReflection')
      .lean(),
  ]);

  const userDoc = asRecord(rawUserDoc);
  const checkIns = Array.isArray(rawCheckIns) ? rawCheckIns.map(asRecord) : [];
  const activeQuests = Array.isArray(rawActiveQuests) ? rawActiveQuests.map(asRecord) : [];
  const insightDoc = asRecord(rawInsightDoc);

  if (!rawUserDoc) {
    throw new Error('User not found.');
  }

  const timezone = sanitizeText(userDoc.timezone, 60) || 'UTC';
  const dayKey = (() => {
    try {
      return getDayKeyTz(now, timezone);
    } catch {
      return getDayKey(now);
    }
  })();

  const userCheckIns = checkIns.filter((entry) => !!entry);
  const checkInHistoryDates = userCheckIns
    .map((entry) => {
      const rawDate = entry.date;
      if (rawDate instanceof Date) return rawDate;
      if (typeof rawDate === 'string' || typeof rawDate === 'number') {
        return new Date(rawDate);
      }
      return null;
    })
    .filter((date): date is Date => Boolean(date && Number.isFinite(date.getTime())));
  const streak = computeDailyStreak(checkInHistoryDates);

  const todayRaw = userCheckIns.find((entry) => extractDayKey(entry, timezone, now) === dayKey);
  const todayCheckIn = todayRaw || null;
  const latestCheckIn = userCheckIns[0] || null;

  const userMood = latestCheckIn
    ? getMoodFromCheckIn(
        isNumber(latestCheckIn.overallScore) ? latestCheckIn.overallScore : Number(latestCheckIn.overallScore),
        Array.isArray(latestCheckIn.ratings) ? (latestCheckIn.ratings as number[]).length * 5 : 25,
      )
    : { emoji: ':-)', label: 'Stable' };

  const currentQuest = activeQuests[0] || null;
  const questCurrent = currentQuest
    ? {
        goal: sanitizeString(currentQuest.goal, 100),
        duration: sanitizeQuestDuration(currentQuest.duration),
        progress: resolveProgress(
          (currentQuest.progress as unknown) ?? (Array.isArray(currentQuest.ratings) ? currentQuest.ratings[0] : 0),
          0,
        ),
      }
    : null;

  const trendRaw = insightDoc?.currentTrend;
  const trend = isValidTrend(trendRaw)
    ? trendRaw
    : 'stable';
  const insightReflection = sanitizeReflection(insightDoc.lastReflection) || 'No reflection yet. Reflect this evening.';
  const topInterest = sanitizeString(insightDoc.topInterest, 80) || 'General';

  const { launcher, nextAction } = computeLauncherState({
    hasCheckIn: Boolean(todayCheckIn),
    quest: questCurrent,
  });

  return {
    version: 'mobile-today.v0',
    generatedAt: now.toISOString(),
    dayKey,
    user: {
      name: sanitizeString(userDoc.name, 80) || 'Adventurer',
      level: clampNumber(userDoc.level, 1, 10000, 1),
      currentXP: clampNumber(userDoc.currentXP, 0, 1_000_000_000, 0),
      requiredXP: clampNumber(userDoc.requiredXP, 100, 1_000_000_000, 100),
      streak,
      mood: {
        emoji: sanitizeText(userMood.emoji, 8) || ':-)',
        label: sanitizeText(userMood.label, 40) || 'Stable',
      },
    },
    checkIn: {
      completedToday: Boolean(todayCheckIn),
      score: toCheckInScore(todayCheckIn?.overallScore),
      dimensions: parseRatingArray(todayCheckIn?.ratings),
    },
    quest: {
      current: questCurrent,
      nextAction,
    },
    insight: {
      trend,
      topInterest,
      productivityScore: clampReflectionScore(insightDoc.productivityScore),
      entertainmentRatio: clampEntertainmentRatio(insightDoc.entertainmentRatio),
      reflection: insightReflection,
    },
    launcher,
  };
}
