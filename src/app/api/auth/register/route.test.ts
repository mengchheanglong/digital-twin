import bcrypt from 'bcryptjs';
import User from '@/lib/models/User';
import { POST } from './route';

const mockSave = jest.fn(() => Promise.resolve());

jest.mock('bcryptjs', () => ({
  hash: jest.fn(() => Promise.resolve('hashed-password')),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/auth', () => ({
  signToken: jest.fn(() => 'mock-token'),
}));

jest.mock('@/lib/validation', () => ({
  validateEmail: jest.fn(() => ({ isValid: true, message: '' })),
  validatePassword: jest.fn(() => ({ isValid: true, message: '' })),
}));

jest.mock('@/lib/progression', () => ({
  getRequiredXP: jest.fn(() => 100),
}));

jest.mock('@/lib/rate-limit', () => ({
  mockLimiterCheckDetailed: jest.fn(() =>
    Promise.resolve({
      allowed: true,
      limit: 5,
      remaining: 4,
      resetAt: new Date('2026-06-24T12:00:00.000Z'),
      retryAfterSeconds: 60,
    }),
  ),
  MongoRateLimiter: jest.fn().mockImplementation(() => ({
    checkDetailed: jest.requireMock('@/lib/rate-limit').mockLimiterCheckDetailed,
  })),
  rateLimitResponse: jest.fn((msg: string, result: { retryAfterSeconds: number }) => {
    const { NextResponse } = jest.requireActual('next/server');
    return NextResponse.json(
      { msg },
      { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } },
    );
  }),
}));

jest.mock('@/lib/models/User', () => {
  const UserMock = jest.fn().mockImplementation(function UserModel(this: any, data: any) {
    Object.assign(this, data, {
      id: 'mock-user-id',
      save: mockSave,
    });
  });
  (UserMock as any).findOne = jest.fn(() => Promise.resolve(null));

  return {
    __esModule: true,
    default: UserMock,
  };
});

describe('registration route', () => {
  const mockLimiterCheckDetailed = jest.requireMock('@/lib/rate-limit')
    .mockLimiterCheckDetailed as jest.Mock;

  const createRequest = (body: unknown = { email: 'test@example.com', password: 'Password123!' }) => {
    return new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '1.2.3.4',
        'Content-Type': 'application/json',
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLimiterCheckDetailed.mockResolvedValue({
      allowed: true,
      limit: 5,
      remaining: 4,
      resetAt: new Date('2026-06-24T12:00:00.000Z'),
      retryAfterSeconds: 60,
    });
    mockSave.mockResolvedValue(undefined);
    (User.findOne as jest.Mock).mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
  });

  it('returns 201 with token and user payload on success', async () => {
    const res = await POST(createRequest());

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({
      token: 'mock-token',
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
        name: 'Test',
      },
    });
    expect(mockLimiterCheckDetailed).toHaveBeenCalledWith('1.2.3.4');
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('blocks when the persistent rate limiter rejects the request', async () => {
    mockLimiterCheckDetailed.mockResolvedValue({
      allowed: false,
      limit: 5,
      remaining: 0,
      resetAt: new Date('2026-06-24T12:00:00.000Z'),
      retryAfterSeconds: 60,
    });

    const res = await POST(createRequest());

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toEqual({
      msg: 'Too many registration attempts. Please try again later.',
    });
  });

  it('returns 400 for malformed JSON instead of 500', async () => {
    const res = await POST(createRequest('{bad-json'));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ msg: 'Invalid JSON body.' });
  });

  it('returns 409 when a duplicate email is detected before insert', async () => {
    (User.findOne as jest.Mock).mockResolvedValue({ id: 'existing-user' });

    const res = await POST(createRequest());

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({ msg: 'User already exists.' });
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('returns 409 when a duplicate-key race happens during save', async () => {
    mockSave.mockRejectedValue({ name: 'MongoServerError', code: 11000 });

    const res = await POST(createRequest());

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({ msg: 'User already exists.' });
  });
});
