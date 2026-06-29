import { buildTwinContextPack } from '@/lib/twin-core/build-context-pack';
import CheckIn from '@/lib/models/CheckIn';
import Quest from '@/lib/models/Quest';
import QuestLog from '@/lib/models/QuestLog';
import JournalEntry from '@/lib/models/JournalEntry';
import FocusSession from '@/lib/models/FocusSession';
import UserInsightState from '@/lib/models/UserInsightState';
import UserMemory from '@/lib/models/UserMemory';
import ChatSignal from '@/lib/models/ChatSignal';
import User from '@/lib/models/User';
import { buildProfile } from '@/lib/profile-service';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/profile-service', () => ({
  buildProfile: jest.fn(),
}));

jest.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock('@/lib/models/CheckIn', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

jest.mock('@/lib/models/Quest', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

jest.mock('@/lib/models/QuestLog', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

jest.mock('@/lib/models/JournalEntry', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

jest.mock('@/lib/models/FocusSession', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

jest.mock('@/lib/models/UserInsightState', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

jest.mock('@/lib/models/UserMemory', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

jest.mock('@/lib/models/ChatSignal', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
  },
}));

const USER_ID = '64b7f37d5f8d9f0012345678';
const NOW = new Date('2026-06-29T12:00:00.000Z');

function queryResult<T>(value: T) {
  const query: any = {
    select: jest.fn(() => query),
    sort: jest.fn(() => query),
    limit: jest.fn(() => query),
    lean: jest.fn(() => Promise.resolve(value)),
  };
  return query;
}

function resetModelMocks() {
  (buildProfile as jest.Mock).mockResolvedValue({
    id: USER_ID,
    name: 'Test User',
    email: 'private@example.com',
    location: '  Bangkok  ',
    bio: '  Building steady habits.  ',
    level: 4,
    currentXP: 120,
    requiredXP: 250,
    dailyStreak: 3,
    avatarStage: 'Focused Strategist',
    joinDate: 'Jan 1, 2026',
    currentMood: { emoji: ':)', label: 'Stable' },
  });
  (User.findById as jest.Mock).mockReturnValue(queryResult({
    name: 'Test User',
    email: 'private@example.com',
    timezone: 'Asia/Bangkok',
    bio: '  Building steady habits.  ',
    location: '  Bangkok  ',
    joinDate: new Date('2026-01-01T00:00:00.000Z'),
  }));
  (CheckIn.find as jest.Mock).mockReturnValue(queryResult([]));
  (Quest.find as jest.Mock).mockReturnValue(queryResult([]));
  (QuestLog.find as jest.Mock).mockReturnValue(queryResult([]));
  (JournalEntry.find as jest.Mock).mockReturnValue(queryResult([]));
  (FocusSession.find as jest.Mock).mockReturnValue(queryResult([]));
  (UserInsightState.findOne as jest.Mock).mockReturnValue(queryResult(null));
  (UserMemory.findOne as jest.Mock).mockReturnValue(queryResult(null));
  (ChatSignal.find as jest.Mock).mockReturnValue(queryResult([]));
}

describe('buildTwinContextPack', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetModelMocks();
  });

  it('returns stable defaults for a new user with no activity', async () => {
    (buildProfile as jest.Mock).mockResolvedValue(null);
    (User.findById as jest.Mock).mockReturnValue(queryResult(null));

    const pack = await buildTwinContextPack(USER_ID, { now: NOW });

    expect(pack).toMatchObject({
      version: 'twin-core.v0',
      generatedAt: '2026-06-29T12:00:00.000Z',
      userId: USER_ID,
      sourceWindows: {
        checkInsDays: 30,
        questsDays: 90,
        journalsDays: 90,
        focusDays: 30,
        chatSignalsDays: 90,
      },
      identity: {
        displayName: 'Adventurer',
      },
      avatar: {
        level: 1,
        currentXP: 0,
        requiredXP: 100,
        avatarStage: 'Focused Strategist',
        dailyStreak: 0,
        currentMood: { emoji: ':)', label: 'Stable' },
      },
      currentState: {
        trend: 'unknown',
        wellness: {
          latestPercentage: null,
          average30d: null,
          checkInCount30d: 0,
        },
        focus: {
          sessions30d: 0,
          completedSessions30d: 0,
          totalMinutes30d: 0,
        },
      },
      patterns: {
        topJournalTags90d: [],
        journalMoodSamples90d: [],
        chatSignals90d: [],
      },
      goals: {
        activeQuests: [],
        completedQuestThemes90d: [],
        completedQuestCount90d: 0,
      },
      memory: {
        summary: '',
        recurringStruggles: [],
        breakthroughTriggers: [],
        effectiveInterventions: [],
        keyPersonalityTraits: [],
        lastSynthesizedAt: null,
      },
      privacy: {
        intendedUse: 'companion_and_world_context',
        rawSensitiveDataIncluded: false,
        userExportEndpoint: '/api/export',
        deleteEndpoint: '/api/user',
      },
    });
  });

  it('excludes email, raw journal content, and raw sensitive fields', async () => {
    (JournalEntry.find as jest.Mock).mockReturnValue(queryResult([
      {
        content: 'secret raw journal content',
        title: 'Private title',
        mood: 'hopeful',
        tags: ['planning'],
        date: NOW,
      },
    ]));
    (UserMemory.findOne as jest.Mock).mockReturnValue(queryResult({
      summary: 'Learns through consistent reflection.',
      recurringStruggles: ['overcommitting'],
      breakthroughTriggers: ['clear priorities'],
      effectiveInterventions: ['short focus blocks'],
      keyPersonalityTraits: ['curious'],
      lastSynthesizedAt: NOW,
      password: 'hashed',
      resetPasswordToken: 'reset-token',
    }));

    const pack = await buildTwinContextPack(USER_ID, { now: NOW });
    const serialized = JSON.stringify(pack);

    expect(serialized).not.toContain('private@example.com');
    expect(serialized).not.toContain('secret raw journal content');
    expect(serialized).not.toContain('Private title');
    expect(serialized).not.toContain('hashed');
    expect(serialized).not.toContain('reset-token');
    expect(pack.privacy.excludes).toEqual(expect.arrayContaining([
      'password',
      'reset tokens',
      'raw journal content',
      'raw chat messages',
      'auth tokens',
      'email',
    ]));
  });

  it('aggregates recent behavioral data', async () => {
    (CheckIn.find as jest.Mock).mockReturnValue(queryResult([
      { percentage: 80, ratings: [5, 4, 3, 4, 4], date: NOW },
      { percentage: 60, ratings: [3, 3, 3, 3, 3], date: new Date('2026-06-20T12:00:00.000Z') },
    ]));
    (Quest.find as jest.Mock).mockReturnValue(queryResult([
      { goal: 'Read nightly', duration: 'daily', progress: 40, completed: false },
      { goal: 'Strength training', duration: 'weekly', progress: 75, completed: false },
    ]));
    (QuestLog.find as jest.Mock).mockReturnValue(queryResult([
      { goal: 'Read nightly', duration: 'daily', completedDate: NOW },
      { goal: 'Read nightly', duration: 'daily', completedDate: new Date('2026-06-24T12:00:00.000Z') },
      { goal: 'Practice piano', duration: 'weekly', completedDate: new Date('2026-06-22T12:00:00.000Z') },
    ]));
    (FocusSession.find as jest.Mock).mockReturnValue(queryResult([
      { durationMinutes: 25, elapsedMinutes: 25, completed: true, startedAt: NOW },
      { durationMinutes: 45, elapsedMinutes: 30, completed: false, startedAt: new Date('2026-06-28T12:00:00.000Z') },
    ]));
    (JournalEntry.find as jest.Mock).mockReturnValue(queryResult([
      { mood: 'calm', tags: ['work', 'focus'], content: 'not exported', date: NOW },
      { mood: 'energized', tags: ['focus', 'health'], content: 'not exported either', date: NOW },
    ]));
    (UserInsightState.findOne as jest.Mock).mockReturnValue(queryResult({
      currentTrend: 'rising',
      checkInDimensions: {
        energy: 80,
        focus: 70,
        stressControl: 60,
        socialConnection: 50,
        optimism: 90,
      },
    }));
    (ChatSignal.find as jest.Mock).mockReturnValue(queryResult([
      { signalType: 'stress', intensity: 4, confidence: 0.8, createdAt: NOW },
      { signalType: 'stress', intensity: 2, confidence: 0.6, createdAt: NOW },
      { signalType: 'focus', intensity: 5, confidence: 0.9, createdAt: NOW },
    ]));

    const pack = await buildTwinContextPack(USER_ID, { now: NOW });

    expect(pack.currentState.wellness).toEqual({
      latestPercentage: 80,
      average30d: 70,
      checkInCount30d: 2,
    });
    expect(pack.currentState.trend).toBe('rising');
    expect(pack.currentState.dimensions).toEqual({
      energy: 80,
      focus: 70,
      stressControl: 60,
      socialConnection: 50,
      optimism: 90,
    });
    expect(pack.currentState.focus).toEqual({
      sessions30d: 2,
      completedSessions30d: 1,
      totalMinutes30d: 55,
    });
    expect(pack.patterns.topJournalTags90d).toEqual(['focus', 'work', 'health']);
    expect(pack.patterns.journalMoodSamples90d).toEqual(['calm', 'energized']);
    expect(pack.patterns.chatSignals90d).toEqual([
      { signalType: 'stress', averageIntensity: 3, averageConfidence: 0.7, count: 2 },
      { signalType: 'focus', averageIntensity: 5, averageConfidence: 0.9, count: 1 },
    ]);
    expect(pack.goals.activeQuests).toEqual([
      { goal: 'Read nightly', duration: 'daily', progress: 40 },
      { goal: 'Strength training', duration: 'weekly', progress: 75 },
    ]);
    expect(pack.goals.completedQuestThemes90d).toEqual(['read nightly', 'practice piano']);
    expect(pack.goals.completedQuestCount90d).toBe(3);
  });

  it('redacts sensitive values embedded in otherwise allowed user-controlled text fields', async () => {
    const email = 'leak@example.com';
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdef1234567890abcdef1234567890';
    const apiKey = 'sk-test_1234567890abcdef1234567890abcdef';
    const resetToken = 'reset-token=abcdef1234567890abcdef1234567890';
    const plainToken = 'abc123xyz789';

    (buildProfile as jest.Mock).mockResolvedValue({
      name: `Display ${email}`,
      location: `Somewhere Bearer ${apiKey}`,
      bio: `My password=${apiKey} and jwt ${jwt} and token=${plainToken}`,
      level: 1,
      currentXP: 0,
      requiredXP: 100,
      dailyStreak: 0,
      avatarStage: 'Focused Strategist',
      joinDate: 'Jan 1, 2026',
      currentMood: { emoji: ':)', label: `Stable ${email}` },
    });
    (User.findById as jest.Mock).mockReturnValue(queryResult({
      name: `User ${email}`,
      timezone: 'Asia/Bangkok',
      bio: `Backup ${resetToken}`,
      location: `Location ${apiKey}`,
      joinDate: NOW,
    }));
    (Quest.find as jest.Mock).mockReturnValue(queryResult([
      { goal: `Rotate token ${apiKey} and token=${plainToken}`, duration: 'daily', progress: 10 },
    ]));
    (QuestLog.find as jest.Mock).mockReturnValue(queryResult([
      { goal: `Done with ${email}`, duration: 'daily', completedDate: NOW },
    ]));
    (JournalEntry.find as jest.Mock).mockReturnValue(queryResult([
      { mood: `mood ${email}`, tags: [`tag ${apiKey}`, `tag token=${plainToken}`], date: NOW },
    ]));
    (UserMemory.findOne as jest.Mock).mockReturnValue(queryResult({
      summary: `Summary includes ${email}`,
      recurringStruggles: [`struggle ${apiKey}`],
      breakthroughTriggers: [`trigger ${jwt}`],
      effectiveInterventions: [`intervention ${resetToken}`],
      keyPersonalityTraits: [`trait Bearer ${apiKey}`],
      lastSynthesizedAt: NOW,
    }));
    (ChatSignal.find as jest.Mock).mockReturnValue(queryResult([
      { signalType: `signal ${email} token=${plainToken}`, intensity: 4, confidence: 0.8, createdAt: NOW },
    ]));

    const pack = await buildTwinContextPack(USER_ID, { now: NOW });
    const serialized = JSON.stringify(pack);

    expect(serialized).not.toContain(email);
    expect(serialized).not.toContain(jwt);
    expect(serialized).not.toContain(apiKey);
    expect(serialized).not.toContain(resetToken);
    expect(serialized).not.toContain(plainToken);
    expect(serialized).toContain('[redacted-email]');
    expect(serialized).toContain('[redacted-secret]');
  });

  it('truncates and limits strings and arrays', async () => {
    const longText = 'x'.repeat(500);

    (Quest.find as jest.Mock).mockReturnValue(queryResult(
      Array.from({ length: 12 }, (_, index) => ({
        goal: `Quest ${index} ${longText}`,
        duration: 'daily',
        progress: 120,
      })),
    ));
    (JournalEntry.find as jest.Mock).mockReturnValue(queryResult(
      Array.from({ length: 20 }, (_, index) => ({
        mood: `mood ${index} ${longText}`,
        tags: [`tag ${index} ${longText}`],
        date: NOW,
      })),
    ));
    (UserMemory.findOne as jest.Mock).mockReturnValue(queryResult({
      summary: longText,
      recurringStruggles: Array.from({ length: 20 }, (_, index) => `struggle ${index} ${longText}`),
      breakthroughTriggers: Array.from({ length: 20 }, (_, index) => `trigger ${index} ${longText}`),
      effectiveInterventions: Array.from({ length: 20 }, (_, index) => `intervention ${index} ${longText}`),
      keyPersonalityTraits: Array.from({ length: 20 }, (_, index) => `trait ${index} ${longText}`),
      lastSynthesizedAt: NOW,
    }));

    const pack = await buildTwinContextPack(USER_ID, { now: NOW });

    expect(pack.goals.activeQuests).toHaveLength(10);
    expect(pack.goals.activeQuests[0].goal.length).toBeLessThanOrEqual(pack.limits.maxStringLength);
    expect(pack.patterns.topJournalTags90d).toHaveLength(pack.limits.maxJournalTags);
    expect(pack.patterns.topJournalTags90d[0].length).toBeLessThanOrEqual(pack.limits.maxStringLength);
    expect(pack.memory.summary.length).toBeLessThanOrEqual(pack.limits.maxStringLength);
    expect(pack.memory.recurringStruggles).toHaveLength(10);
    expect(pack.memory.recurringStruggles[0].length).toBeLessThanOrEqual(pack.limits.maxStringLength);
  });
});
