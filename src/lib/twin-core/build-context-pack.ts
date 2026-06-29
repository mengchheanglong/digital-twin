import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import { buildProfile } from '@/lib/profile-service';
import User from '@/lib/models/User';
import CheckIn from '@/lib/models/CheckIn';
import Quest from '@/lib/models/Quest';
import QuestLog from '@/lib/models/QuestLog';
import JournalEntry from '@/lib/models/JournalEntry';
import FocusSession from '@/lib/models/FocusSession';
import UserInsightState from '@/lib/models/UserInsightState';
import UserMemory from '@/lib/models/UserMemory';
import ChatSignal from '@/lib/models/ChatSignal';
import {
  TwinContextPack,
  TwinContextLimits,
  TwinCurrentStateContext,
  TwinSourceWindows,
} from './types';
import { clampNumber, roundNumber, sanitizeStringArray, sanitizeText } from './sanitize';

export interface BuildTwinContextPackOptions {
  now?: Date;
  windows?: Partial<TwinSourceWindows>;
}

type PlainRecord = Record<string, unknown>;

const DEFAULT_WINDOWS: TwinSourceWindows = {
  checkInsDays: 30,
  questsDays: 90,
  journalsDays: 90,
  focusDays: 30,
  chatSignalsDays: 90,
};

const LIMITS: TwinContextLimits = {
  maxStringLength: 160,
  maxActiveQuests: 10,
  maxJournalTags: 10,
  maxChatSignalTypes: 10,
  notes: [
    'Context pack v0 uses summarized and aggregated data only.',
    'Journal content and chat messages are excluded.',
    'Values are truncated and arrays are capped for predictable consumers.',
  ],
};

function daysBefore(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function toIsoDate(value: unknown): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return sanitizeText(value, 80) || undefined;
  return date.toISOString();
}

function toOptionalText(value: unknown, maxLength: number = LIMITS.maxStringLength): string | undefined {
  const text = sanitizeText(value, maxLength);
  return text || undefined;
}

function percentageOrNull(value: unknown): number | null {
  const rounded = roundNumber(clampNumber(value, 0, 100, Number.NaN), 1);
  return rounded;
}

function getRecordValue(record: PlainRecord | null | undefined, key: string): unknown {
  return record ? record[key] : undefined;
}

function getMood(profile: PlainRecord | null | undefined) {
  const rawMood = getRecordValue(profile, 'currentMood') as PlainRecord | undefined;
  return {
    emoji: sanitizeText(getRecordValue(rawMood, 'emoji'), 16) || ':)',
    label: sanitizeText(getRecordValue(rawMood, 'label'), 40) || 'Stable',
  };
}

function aggregateTopStrings(values: string[], maxItems: number): string[] {
  const frequency = new Map<string, number>();

  for (const value of values) {
    const text = sanitizeText(value, LIMITS.maxStringLength).toLowerCase();
    if (!text) continue;
    frequency.set(text, (frequency.get(text) || 0) + 1);
  }

  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxItems)
    .map(([value]) => value);
}

function buildDimensions(value: unknown): TwinCurrentStateContext['dimensions'] {
  if (!value || typeof value !== 'object') return undefined;

  const record = value as PlainRecord;
  return {
    energy: clampNumber(record.energy, 0, 100, 0),
    focus: clampNumber(record.focus, 0, 100, 0),
    stressControl: clampNumber(record.stressControl, 0, 100, 0),
    socialConnection: clampNumber(record.socialConnection, 0, 100, 0),
    optimism: clampNumber(record.optimism, 0, 100, 0),
  };
}

function buildFocusSummary(focusSessions: PlainRecord[]) {
  let completedSessions30d = 0;
  let totalMinutes30d = 0;

  for (const session of focusSessions) {
    if (session.completed === true) completedSessions30d += 1;
    const minutes = Number.isFinite(Number(session.elapsedMinutes))
      ? Number(session.elapsedMinutes)
      : Number(session.durationMinutes);
    totalMinutes30d += clampNumber(minutes, 0, 480, 0);
  }

  return {
    sessions30d: focusSessions.length,
    completedSessions30d,
    totalMinutes30d: roundNumber(totalMinutes30d, 0) || 0,
  };
}

function buildChatSignalSummary(chatSignals: PlainRecord[]) {
  const grouped = new Map<string, { intensity: number; confidence: number; count: number }>();

  for (const signal of chatSignals) {
    const signalType = sanitizeText(signal.signalType, 80).toLowerCase();
    if (!signalType) continue;

    const current = grouped.get(signalType) || { intensity: 0, confidence: 0, count: 0 };
    current.intensity += clampNumber(signal.intensity, 0, 5, 0);
    current.confidence += clampNumber(signal.confidence, 0, 1, 0);
    current.count += 1;
    grouped.set(signalType, current);
  }

  return Array.from(grouped.entries())
    .map(([signalType, aggregate]) => ({
      signalType,
      averageIntensity: roundNumber(aggregate.intensity / aggregate.count, 2) || 0,
      averageConfidence: roundNumber(aggregate.confidence / aggregate.count, 3) || 0,
      count: aggregate.count,
    }))
    .sort((a, b) => b.count - a.count || a.signalType.localeCompare(b.signalType))
    .slice(0, LIMITS.maxChatSignalTypes);
}

function buildActiveQuests(quests: PlainRecord[]) {
  return quests.slice(0, LIMITS.maxActiveQuests).map((quest) => ({
    goal: sanitizeText(quest.goal, LIMITS.maxStringLength),
    duration: sanitizeText(quest.duration, 40),
    progress: roundNumber(clampNumber(quest.progress, 0, 100, Number.NaN), 0),
  }));
}

function buildMemory(memory: PlainRecord | null) {
  return {
    summary: sanitizeText(memory?.summary, LIMITS.maxStringLength),
    recurringStruggles: sanitizeStringArray(memory?.recurringStruggles, 10, LIMITS.maxStringLength),
    breakthroughTriggers: sanitizeStringArray(memory?.breakthroughTriggers, 10, LIMITS.maxStringLength),
    effectiveInterventions: sanitizeStringArray(memory?.effectiveInterventions, 10, LIMITS.maxStringLength),
    keyPersonalityTraits: sanitizeStringArray(memory?.keyPersonalityTraits, 10, LIMITS.maxStringLength),
    lastSynthesizedAt: toIsoDate(memory?.lastSynthesizedAt) || null,
  };
}

export async function buildTwinContextPack(
  userId: string,
  options: BuildTwinContextPackOptions = {},
): Promise<TwinContextPack> {
  await dbConnect();

  const now = options.now || new Date();
  const sourceWindows: TwinSourceWindows = { ...DEFAULT_WINDOWS, ...options.windows };
  const uid = new mongoose.Types.ObjectId(userId);

  const [
    profileResult,
    userDoc,
    checkIns,
    activeQuests,
    completedQuestLogs,
    journals,
    focusSessions,
    insightState,
    memory,
    chatSignals,
  ] = await Promise.all([
    buildProfile(userId),
    User.findById(uid)
      .select('name bio location timezone joinDate')
      .lean() as unknown as Promise<PlainRecord | null>,
    CheckIn.find({
      userId: uid,
      date: { $gte: daysBefore(now, sourceWindows.checkInsDays) },
      checkInType: { $ne: 'micro' },
    })
      .select('percentage ratings date')
      .sort({ date: -1 })
      .limit(100)
      .lean() as unknown as Promise<PlainRecord[]>,
    Quest.find({ userId: uid, completed: false })
      .select('goal duration progress date')
      .sort({ date: -1 })
      .limit(LIMITS.maxActiveQuests)
      .lean() as unknown as Promise<PlainRecord[]>,
    QuestLog.find({
      userId: uid,
      completedDate: { $gte: daysBefore(now, sourceWindows.questsDays) },
      isDeleted: { $ne: true },
    })
      .select('goal duration completedDate')
      .sort({ completedDate: -1 })
      .limit(100)
      .lean() as unknown as Promise<PlainRecord[]>,
    JournalEntry.find({
      userId: uid,
      date: { $gte: daysBefore(now, sourceWindows.journalsDays) },
    })
      .select('mood tags date')
      .sort({ date: -1 })
      .limit(100)
      .lean() as unknown as Promise<PlainRecord[]>,
    FocusSession.find({
      userId: uid,
      startedAt: { $gte: daysBefore(now, sourceWindows.focusDays) },
    })
      .select('durationMinutes elapsedMinutes completed startedAt')
      .sort({ startedAt: -1 })
      .limit(100)
      .lean() as unknown as Promise<PlainRecord[]>,
    UserInsightState.findOne({ userId: uid })
      .select('currentTrend checkInDimensions')
      .lean() as unknown as Promise<PlainRecord | null>,
    UserMemory.findOne({ userId: uid })
      .select(
        'summary recurringStruggles breakthroughTriggers effectiveInterventions keyPersonalityTraits lastSynthesizedAt',
      )
      .lean() as unknown as Promise<PlainRecord | null>,
    ChatSignal.find({
      userId,
      createdAt: { $gte: daysBefore(now, sourceWindows.chatSignalsDays) },
    })
      .select('signalType intensity confidence createdAt')
      .sort({ createdAt: -1 })
      .limit(500)
      .lean() as unknown as Promise<PlainRecord[]>,
  ]);

  const profile = profileResult as PlainRecord | null;
  const percentages = checkIns
    .map((checkIn) => percentageOrNull(checkIn.percentage))
    .filter((value): value is number => value !== null);
  const latestPercentage = percentages.length > 0 ? percentages[0] : null;
  const average30d = percentages.length > 0
    ? roundNumber(percentages.reduce((sum, value) => sum + value, 0) / percentages.length, 1)
    : null;
  const trend = insightState?.currentTrend;
  const journalTags = journals.flatMap((journal) => (
    Array.isArray(journal.tags) ? journal.tags.map((tag) => String(tag)) : []
  ));
  const journalMoods = journals.map((journal) => journal.mood);
  const identityBio = toOptionalText(profile?.bio || userDoc?.bio);
  const identityLocation = toOptionalText(profile?.location || userDoc?.location, 80);
  const identityTimezone = toOptionalText(userDoc?.timezone || profile?.timezone, 80);
  const identityJoinDate = toOptionalText(profile?.joinDate, 80) || toIsoDate(userDoc?.joinDate);

  return {
    version: 'twin-core.v0',
    generatedAt: now.toISOString(),
    userId,
    sourceWindows,
    identity: {
      displayName: sanitizeText(profile?.name || userDoc?.name, 80) || 'Adventurer',
      ...(identityTimezone ? { timezone: identityTimezone } : {}),
      ...(identityBio ? { profileBio: identityBio } : {}),
      ...(identityLocation ? { location: identityLocation } : {}),
      ...(identityJoinDate ? { joinDate: identityJoinDate } : {}),
    },
    avatar: {
      level: clampNumber(profile?.level, 1, 1000, 1),
      currentXP: clampNumber(profile?.currentXP, 0, 1_000_000_000, 0),
      requiredXP: clampNumber(profile?.requiredXP, 1, 1_000_000_000, 100),
      avatarStage: sanitizeText(profile?.avatarStage, 80) || 'Focused Strategist',
      dailyStreak: clampNumber(profile?.dailyStreak || profile?.currentStreak, 0, 10000, 0),
      currentMood: getMood(profile),
    },
    currentState: {
      trend: trend === 'rising' || trend === 'stable' || trend === 'dropping' ? trend : 'unknown',
      wellness: {
        latestPercentage,
        average30d,
        checkInCount30d: checkIns.length,
      },
      ...(buildDimensions(insightState?.checkInDimensions)
        ? { dimensions: buildDimensions(insightState?.checkInDimensions) }
        : {}),
      focus: buildFocusSummary(focusSessions),
    },
    patterns: {
      topJournalTags90d: aggregateTopStrings(journalTags, LIMITS.maxJournalTags),
      journalMoodSamples90d: sanitizeStringArray(journalMoods, 10, LIMITS.maxStringLength),
      chatSignals90d: buildChatSignalSummary(chatSignals),
    },
    goals: {
      activeQuests: buildActiveQuests(activeQuests),
      completedQuestThemes90d: aggregateTopStrings(
        completedQuestLogs.map((questLog) => sanitizeText(questLog.goal, LIMITS.maxStringLength)),
        10,
      ),
      completedQuestCount90d: completedQuestLogs.length,
    },
    memory: buildMemory(memory),
    privacy: {
      intendedUse: 'companion_and_world_context',
      excludes: [
        'password',
        'reset tokens',
        'raw journal content',
        'raw chat messages',
        'auth tokens',
        'email',
      ],
      rawSensitiveDataIncluded: false,
      userExportEndpoint: '/api/export',
      deleteEndpoint: '/api/user',
    },
    limits: LIMITS,
  };
}
