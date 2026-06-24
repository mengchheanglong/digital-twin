import dbConnect from './db';
import RateLimitEntry from './models/RateLimitEntry';
import {
  buildRateLimitKey,
  MongoRateLimiter,
  rateLimitHeaders,
  rateLimitResponse,
} from './rate-limit';

jest.mock('./db', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

jest.mock('./models/RateLimitEntry', () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: jest.fn(),
  },
}));

describe('MongoRateLimiter', () => {
  const findOneAndUpdate = RateLimitEntry.findOneAndUpdate as jest.Mock;
  const mockedDbConnect = dbConnect as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_100);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps check() compatible with the boolean API', async () => {
    const limiter = new MongoRateLimiter('login', 60_000, 5);

    findOneAndUpdate.mockResolvedValueOnce({ count: 5 }).mockResolvedValueOnce({ count: 6 });

    await expect(limiter.check('ip:1.2.3.4')).resolves.toBe(true);
    await expect(limiter.check('ip:1.2.3.4')).resolves.toBe(false);
  });

  it('returns detailed remaining and retry metadata', async () => {
    const limiter = new MongoRateLimiter('login', 60_000, 5);
    findOneAndUpdate.mockResolvedValue({ count: 3 });

    const result = await limiter.checkDetailed('ip:1.2.3.4');

    expect(result).toEqual({
      allowed: true,
      limit: 5,
      remaining: 2,
      resetAt: new Date(1_700_000_040_000),
      retryAfterSeconds: 40,
    });
    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { windowId: 'login:ip:1.2.3.4:1699999980000' },
      {
        $inc: { count: 1 },
        $setOnInsert: {
          windowId: 'login:ip:1.2.3.4:1699999980000',
          key: 'ip:1.2.3.4',
          purpose: 'login',
          resetAt: new Date(1_700_000_040_000),
        },
      },
      { upsert: true, new: true },
    );
  });

  it('fails open when Mongo storage is unavailable', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const limiter = new MongoRateLimiter('login', 60_000, 5);
    mockedDbConnect.mockRejectedValue(new Error('temporary outage'));

    await expect(limiter.checkDetailed('ip:1.2.3.4')).resolves.toEqual({
      allowed: true,
      limit: 5,
      remaining: 5,
      resetAt: new Date(1_700_000_040_000),
      retryAfterSeconds: 40,
    });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Rate limit storage failed open'),
      expect.any(Error),
    );
  });
});

describe('rate-limit helpers', () => {
  it('builds keys for IP, user fallback, and route scopes', () => {
    const req = new Request('http://localhost/api/auth/login', {
      headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.2' },
    });

    expect(buildRateLimitKey(req)).toBe('ip:203.0.113.10');
    expect(buildRateLimitKey(req, { scope: 'user' })).toBe('ip:203.0.113.10');
    expect(buildRateLimitKey(req, { scope: 'user', userId: 'user-1' })).toBe('user:user-1');
    expect(buildRateLimitKey(req, { scope: 'ip+route' })).toBe(
      'route:/api/auth/login:ip:203.0.113.10',
    );
    expect(buildRateLimitKey(req, { scope: 'user+route', userId: 'user-1', route: 'login' })).toBe(
      'route:login:user:user-1',
    );
  });

  it('sets standard rate-limit response headers', async () => {
    const result = {
      allowed: false,
      limit: 5,
      remaining: 0,
      resetAt: new Date('2026-06-24T12:00:00.000Z'),
      retryAfterSeconds: 30,
    };

    expect(rateLimitHeaders(result)).toEqual({
      'Retry-After': '30',
      'X-RateLimit-Limit': '5',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': '1782302400',
    });

    const response = rateLimitResponse('Too many requests.', result);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('30');
    expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('X-RateLimit-Reset')).toBe('1782302400');
    await expect(response.json()).resolves.toEqual({ msg: 'Too many requests.' });
  });
});
