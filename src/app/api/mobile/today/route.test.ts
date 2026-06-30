import { GET } from './route';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { buildMobileToday } from '@/lib/mobile-today';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/auth', () => ({
  verifyTokenWithRevocation: jest.fn(),
}));

jest.mock('@/lib/mobile-today', () => ({
  buildMobileToday: jest.fn(),
}));

const USER_ID = '64b7f37d5f8d9f0012345678';
const NOW = new Date('2026-06-30T12:00:00.000Z');

describe('GET /api/mobile/today', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    (verifyTokenWithRevocation as jest.Mock).mockResolvedValue(null);

    const res = await GET(new Request('http://localhost/api/mobile/today'));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ msg: 'No token, authorization denied.' });
    expect(buildMobileToday).not.toHaveBeenCalled();
  });

  it('returns 200 and no-store for authenticated requests', async () => {
    (verifyTokenWithRevocation as jest.Mock).mockResolvedValue({ id: USER_ID });
    (buildMobileToday as jest.Mock).mockResolvedValue({
      version: 'mobile-today.v0',
      generatedAt: NOW.toISOString(),
      dayKey: '2026-06-30',
      user: {
        name: 'Test User',
        level: 3,
        currentXP: 90,
        requiredXP: 200,
        streak: 1,
        mood: { emoji: '😊', label: 'Great' },
      },
      checkIn: {
        completedToday: true,
        score: 20,
        dimensions: {
          energy: 4,
          focus: 4,
          stressControl: 4,
          socialConnection: 3,
          optimism: 3,
        },
      },
      quest: {
        current: { goal: 'Read 10 pages', duration: 'daily', progress: 30 },
        nextAction: {
          label: 'Continue quest',
          href: '/dashboard/quest',
          reason: 'Resume momentum.',
        },
      },
      insight: {
        trend: 'stable',
        topInterest: 'Balance',
        productivityScore: 55,
        entertainmentRatio: 0.2,
        reflection: 'Steady, useful progress today.',
      },
      launcher: {
        primaryLabel: 'Continue quest',
        primaryHref: '/dashboard/quest',
        secondaryLabel: 'Reflect',
        secondaryHref: '/dashboard/chat',
      },
    });

    const res = await GET(new Request('http://localhost/api/mobile/today'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.json()).toMatchObject({
      success: true,
      today: {
        version: 'mobile-today.v0',
      },
    });
  });

  it('calls buildMobileToday(user.id)', async () => {
    (verifyTokenWithRevocation as jest.Mock).mockResolvedValue({ id: USER_ID });
    (buildMobileToday as jest.Mock).mockResolvedValue({ version: 'mobile-today.v0' });

    await GET(new Request('http://localhost/api/mobile/today'));

    expect(buildMobileToday).toHaveBeenCalledWith(USER_ID);
  });

  it('returns server error when builder throws', async () => {
    (verifyTokenWithRevocation as jest.Mock).mockResolvedValue({ id: USER_ID });
    (buildMobileToday as jest.Mock).mockRejectedValue(new Error('builder failed'));

    const res = await GET(new Request('http://localhost/api/mobile/today'));

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ msg: 'Server error.' });
  });
});
