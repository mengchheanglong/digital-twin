import { buildMobileToday, type MobileToday } from './mobile-today';
import User from '@/lib/models/User';
import CheckIn from '@/lib/models/CheckIn';
import Quest from '@/lib/models/Quest';
import UserInsightState from '@/lib/models/UserInsightState';
import { getDayKeyTz } from '@/lib/progression';

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

jest.mock('@/lib/models/UserInsightState', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

type ChainMock<T> = {
  select: jest.Mock;
  sort: jest.Mock;
  limit: jest.Mock;
  lean: jest.Mock<Promise<T>>;
};

function buildChain<T>(value: T): ChainMock<T> & { [key: string]: jest.Mock } {
  const chain: any = {};
  chain.select = jest.fn(() => chain);
  chain.sort = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.lean = jest.fn(() => Promise.resolve(value));
  return chain;
}

const USER_ID = '64b7f37d5f8d9f0012345678';
const NOW = new Date('2026-06-30T12:00:00.000Z');

describe('buildMobileToday', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const defaultUser = {
      name: 'Test User',
      level: 4,
      currentXP: 120,
      requiredXP: 250,
      timezone: 'Asia/Bangkok',
      email: 'private@example.com',
    };
    (User.findById as jest.Mock).mockReturnValue(buildChain(defaultUser));
    (CheckIn.find as jest.Mock).mockReturnValue(buildChain([]));
    (Quest.find as jest.Mock).mockReturnValue(buildChain([]));
    (UserInsightState.findOne as jest.Mock).mockReturnValue(
      buildChain({
        currentTrend: 'stable',
        topInterest: 'General',
        productivityScore: 0,
        entertainmentRatio: 0,
        lastReflection: 'Build your baseline.',
      }),
    );
  });

  it('returns compact launcher state for authenticated check-in + quest data', async () => {
    const dayKey = getDayKeyTz(NOW, 'Asia/Bangkok');
    const checkInHistory = [
      {
        _id: 'checkin-today',
        userId: USER_ID,
        dayKey,
        overallScore: 19,
        ratings: [4, 4, 3, 5, 3],
        date: NOW,
      },
      {
        _id: 'checkin-previous',
        userId: USER_ID,
        dayKey: getDayKeyTz(new Date('2026-06-29T12:00:00.000Z'), 'Asia/Bangkok'),
        overallScore: 18,
        ratings: [3, 4, 4, 3, 4],
        date: new Date('2026-06-29T12:00:00.000Z'),
      },
    ];
    const quest = [{ goal: 'Read 20 minutes', duration: 'daily', progress: 40, _id: 'q1' }];
    const insight = {
      currentTrend: 'rising',
      topInterest: 'Focus',
      productivityScore: 78,
      entertainmentRatio: 0.24,
      lastReflection: 'A quiet, deliberate check-in day.',
    };

    (CheckIn.find as jest.Mock).mockReturnValue(buildChain(checkInHistory));
    (Quest.find as jest.Mock).mockReturnValue(buildChain(quest));
    (UserInsightState.findOne as jest.Mock).mockReturnValue(buildChain(insight));

    const result = await buildMobileToday(USER_ID, { now: NOW });

    expect(result).toEqual({
      version: 'mobile-today.v0',
      generatedAt: NOW.toISOString(),
      dayKey,
      user: {
        name: 'Test User',
        level: 4,
        currentXP: 120,
        requiredXP: 250,
        streak: 2,
        mood: {
          emoji: expect.any(String),
          label: 'Great',
        },
      },
      checkIn: {
        completedToday: true,
        historyCount: 2,
        score: 19,
        dimensions: {
          energy: 4,
          focus: 4,
          stressControl: 3,
          socialConnection: 5,
          optimism: 3,
        },
      },
      quest: {
        current: {
          goal: 'Read 20 minutes',
          duration: 'daily',
          progress: 40,
        },
        nextAction: {
          label: 'Continue quest',
          href: '/dashboard/quest',
          reason: 'Resume your active quest to keep momentum.',
        },
      },
      insight: {
        trend: 'rising',
        topInterest: 'Focus',
        productivityScore: 78,
        entertainmentRatio: 0.24,
        reflection: 'A quiet, deliberate check-in day.',
      },
      launcher: {
        primaryLabel: 'Continue quest',
        primaryHref: '/dashboard/quest',
        secondaryLabel: 'Reflect',
        secondaryHref: '/dashboard/chat',
      },
    });
  });

  it('prioritizes check-in when daily check-in is missing', async () => {
    const dayKey = getDayKeyTz(NOW, 'Asia/Bangkok');
    const quest = [{ goal: 'Strength training', duration: 'weekly', progress: 60, _id: 'q1' }];
    const insight = {
      currentTrend: 'stable',
      topInterest: 'Health',
      productivityScore: 50,
      entertainmentRatio: 0.5,
      lastReflection: 'Start with tiny steps.',
    };

    (CheckIn.find as jest.Mock).mockReturnValue(buildChain([]));
    (Quest.find as jest.Mock).mockReturnValue(buildChain(quest));
    (UserInsightState.findOne as jest.Mock).mockReturnValue(buildChain(insight));

    const result = await buildMobileToday(USER_ID, { now: NOW });

    expect(result.checkIn.completedToday).toBe(false);
    expect(result.checkIn.historyCount).toBe(0);
    expect(result.checkIn.score).toBe(null);
    expect(result.checkIn.dimensions).toBe(null);
    expect(result.launcher.primaryLabel).toBe('Check in');
    expect(result.launcher.primaryHref).toBe('/dashboard/checkin');
    expect(result.quest.nextAction.label).toBe('Check in');
    expect(result.quest.nextAction.href).toBe('/dashboard/checkin');
    expect(result.dayKey).toBe(dayKey);
  });

  it('keeps mobile reflection text from ending mid-sentence', async () => {
    const longReflection = [
      'Your dedication to your daily routines is impressive, hitting 85.7% productivity while maintaining a steady rhythm-that is a real strength.',
      'At the same time, you may want to add one quiet recovery block before the evening so the momentum stays sustainable.',
      'Keep tomorrow simple.',
    ].join(' ');

    (CheckIn.find as jest.Mock).mockReturnValue(buildChain([]));
    (Quest.find as jest.Mock).mockReturnValue(buildChain([]));
    (UserInsightState.findOne as jest.Mock).mockReturnValue(
      buildChain({
        currentTrend: 'stable',
        topInterest: 'Daily',
        productivityScore: 85.7,
        entertainmentRatio: 0,
        lastReflection: longReflection,
      }),
    );

    const result = await buildMobileToday(USER_ID, { now: NOW });

    expect(result.insight.reflection).toBe(
      'Your dedication to your daily routines is impressive, hitting 85.7% productivity while maintaining a steady rhythm-that is a real strength.',
    );
    expect(result.insight.reflection).not.toContain('At the same time, you');
  });

  it('sanitizes and redacts embedded secret-like text in user, quest, and insight fields', async () => {
    const nowSecret = new Date('2026-06-30T12:00:00.000Z');
    const email = 'leak@example.com';
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoiam9obiJ9.abc1234567890defghijklmno';
    const apiKey = 'sk-test_1234567890abcdef1234567890abcdef';
    const plainToken = 'abc1234567890abcdef1234567890abcdef1234';
    const dayKey = getDayKeyTz(nowSecret, 'Asia/Bangkok');

    (User.findById as jest.Mock).mockReturnValue(
      buildChain({
        name: `Profile ${email}`,
        level: 3,
        currentXP: 55,
        requiredXP: 175,
        timezone: 'Asia/Bangkok',
      }),
    );
    (CheckIn.find as jest.Mock).mockReturnValue(
      buildChain([
        {
          dayKey,
          overallScore: 15,
          ratings: [2, 3, 4, 3, 3],
          date: nowSecret,
        },
      ]),
    );
    (Quest.find as jest.Mock).mockReturnValue(
      buildChain([
        {
          goal: `${apiKey} ${jwt} ${plainToken}`,
          duration: 'daily',
          progress: 20,
        },
      ]),
    );
    (UserInsightState.findOne as jest.Mock).mockReturnValue(
      buildChain({
        currentTrend: 'dropping',
        topInterest: `Email ${email}`,
        productivityScore: 40,
        entertainmentRatio: 0.3,
        lastReflection: `Remember ${apiKey} and ${jwt} and ${plainToken}`,
      }),
    );

    const result = await buildMobileToday(USER_ID, { now: nowSecret });
    const serialized = JSON.stringify(result);

    expect(result.user.name).toContain('[redacted-email]');
    expect(serialized).not.toContain(email);
    expect(serialized).not.toContain(jwt);
    expect(serialized).not.toContain(apiKey);
    expect(serialized).not.toContain(plainToken);
    expect(serialized).toContain('[redacted-secret]');
  });

  it('serialized output contains no email, journal, chatMessages, password, or raw token text', async () => {
    const nowSecret = new Date('2026-06-30T12:00:00.000Z');
    const secretPatternValue = 'abc1234567890abcdef1234567890abcdef12345678';
    const dayKey = getDayKeyTz(nowSecret, 'Asia/Bangkok');

    (User.findById as jest.Mock).mockReturnValue(
      buildChain({
        name: 'Privacy Guard',
        level: 2,
        currentXP: 35,
        requiredXP: 125,
        timezone: 'Asia/Bangkok',
        email: 'hidden@example.com',
        password: 'super-secret-password',
      }),
    );
    (CheckIn.find as jest.Mock).mockReturnValue(
      buildChain([
        {
          dayKey,
          overallScore: 10,
          ratings: [1, 2, 3, 4, 5],
          date: nowSecret,
        },
      ]),
    );
    (Quest.find as jest.Mock).mockReturnValue(buildChain([]));
    (UserInsightState.findOne as jest.Mock).mockReturnValue(
      buildChain({
        currentTrend: 'stable',
        topInterest: `Hidden ${secretPatternValue}`,
        productivityScore: 40,
        entertainmentRatio: 0.2,
        lastReflection: `Keep a journal entry: secret raw journal content with ${secretPatternValue}`,
      }),
    );

    const result: MobileToday = await buildMobileToday(USER_ID, { now: nowSecret });
    const serialized = JSON.stringify(result);

    expect(result).not.toHaveProperty('email');
    expect(serialized).not.toContain('hidden@example.com');
    expect(serialized).not.toContain('chatMessages');
    expect(serialized).not.toContain('\"journal\"');
    expect(serialized).not.toContain('super-secret-password');
    expect(serialized).not.toContain('password=');
    expect(serialized).not.toContain(secretPatternValue);
    expect(serialized).not.toContain('raw chat messages');
    expect(serialized).not.toMatch(/password/i);
  });
});
