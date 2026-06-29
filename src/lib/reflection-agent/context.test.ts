import {
  buildReflectionSystemPrompt,
  formatTwinContextForReflection,
} from './context';
import type { TwinContextPack } from '@/lib/twin-core';

const twinPack: TwinContextPack = {
  version: 'twin-core.v0',
  generatedAt: '2026-06-29T12:00:00.000Z',
  userId: '64b7f37d5f8d9f0012345678',
  sourceWindows: {
    checkInsDays: 30,
    questsDays: 90,
    journalsDays: 90,
    focusDays: 30,
    chatSignalsDays: 90,
  },
  identity: {
    displayName: 'Mira',
    timezone: 'Asia/Bangkok',
    profileBio: 'Building calmer routines.',
  },
  avatar: {
    level: 7,
    currentXP: 320,
    requiredXP: 500,
    avatarStage: 'Focused Strategist',
    dailyStreak: 4,
    currentMood: {
      emoji: ':)',
      label: 'Calm',
    },
  },
  currentState: {
    trend: 'rising',
    wellness: {
      latestPercentage: 82,
      average30d: 74.5,
      checkInCount30d: 12,
    },
    dimensions: {
      energy: 70,
      focus: 78,
      stressControl: 62,
      socialConnection: 55,
      optimism: 81,
    },
    focus: {
      sessions30d: 8,
      completedSessions30d: 6,
      totalMinutes30d: 210,
    },
  },
  patterns: {
    topJournalTags90d: ['focus', 'sleep', 'planning', 'health', 'family', 'study', 'extra'],
    journalMoodSamples90d: ['calm', 'energized', 'tired', 'hopeful', 'steady', 'extra'],
    chatSignals90d: [
      { signalType: 'stress', averageIntensity: 3.5, averageConfidence: 0.82, count: 5 },
      { signalType: 'focus', averageIntensity: 4, averageConfidence: 0.9, count: 4 },
    ],
  },
  goals: {
    activeQuests: [
      { goal: 'Write for 20 minutes', duration: 'daily', progress: 40 },
      { goal: 'Evening walk', duration: 'weekly', progress: 60 },
    ],
    completedQuestThemes90d: ['reading', 'meditation'],
    completedQuestCount90d: 6,
  },
  memory: {
    summary: 'Benefits from short plans and visible next actions.',
    recurringStruggles: ['overcommitting', 'late-night scrolling'],
    breakthroughTriggers: ['clear priorities', 'morning planning'],
    effectiveInterventions: ['25-minute focus blocks', 'phone out of room'],
    keyPersonalityTraits: ['curious', 'reflective'],
    lastSynthesizedAt: '2026-06-28T12:00:00.000Z',
  },
  privacy: {
    intendedUse: 'companion_and_world_context',
    excludes: ['password', 'raw journal content', 'raw chat messages', 'email'],
    rawSensitiveDataIncluded: false,
    userExportEndpoint: '/api/export',
    deleteEndpoint: '/api/user',
  },
  limits: {
    maxStringLength: 160,
    maxActiveQuests: 10,
    maxJournalTags: 10,
    maxChatSignalTypes: 10,
    notes: ['Summarized context only.'],
  },
};

describe('formatTwinContextForReflection', () => {
  it('formats identity, wellness, goals, patterns, chat signals, and memory', () => {
    const output = formatTwinContextForReflection(twinPack);

    expect(output).toContain('Twin Context Pack');
    expect(output).toContain('Display name: Mira');
    expect(output).toContain('Avatar stage: Focused Strategist; level 7');
    expect(output).toContain('Current mood: :) Calm');
    expect(output).toContain('Wellness trend: rising; latest 82%; 30d average 74.5%; check-ins 12.');
    expect(output).toContain('Active quest: Write for 20 minutes');
    expect(output).toContain('Top journal tags: focus');
    expect(output).toContain('Chat signal: stress intensity 3.5/5');
    expect(output).toContain('Summary: Benefits from short plans and visible next actions.');
  });

  it('does not produce a raw JSON dump', () => {
    const output = formatTwinContextForReflection(twinPack);

    expect(output.startsWith('{')).toBe(false);
    expect(output).not.toContain('"version":');
  });

  it('returns an empty string when no pack is available', () => {
    expect(formatTwinContextForReflection(null)).toBe('');
    expect(formatTwinContextForReflection(undefined)).toBe('');
  });
});

describe('buildReflectionSystemPrompt', () => {
  it('includes Twin context and tells the model not to recite it as a dashboard', () => {
    const prompt = buildReflectionSystemPrompt({
      twinContext: 'Twin Context Pack\n- Display name: Mira',
    });

    expect(prompt).toContain('=== TWIN CONTEXT ===');
    expect(prompt).toContain('Twin Context Pack');
    expect(prompt).toContain('Do not recite it as a dashboard');
  });

  it('includes safety and anti-fabrication instructions', () => {
    const prompt = buildReflectionSystemPrompt({});

    expect(prompt).toContain('Do not fabricate personal history');
    expect(prompt).toContain('Do not provide medical diagnosis, legal advice, or financial advice');
    expect(prompt).toContain('local emergency or crisis services');
  });

  it('works without Twin context and still includes legacy memory and insight', () => {
    const prompt = buildReflectionSystemPrompt({
      memoryContext: 'Prefers morning planning.',
      insight: {
        topInterest: 'writing',
        currentTrend: 'stable',
        entertainmentRatio: 0.25,
        lastReflection: 'Small steps worked well.',
      },
    });

    expect(prompt).not.toContain('=== TWIN CONTEXT ===');
    expect(prompt).toContain('=== LEGACY MEMORY ===');
    expect(prompt).toContain('Prefers morning planning.');
    expect(prompt).toContain('=== INSIGHT CONTEXT ===');
    expect(prompt).toContain('Top interest: writing');
    expect(prompt).toContain('Entertainment ratio: 25%');
  });
});
