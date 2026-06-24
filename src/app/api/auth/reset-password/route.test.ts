import bcrypt from 'bcryptjs';
import User from '@/lib/models/User';
import { POST } from './route';

const mockSave = jest.fn(() => Promise.resolve());

jest.mock('bcryptjs', () => ({
  compare: jest.fn(() => Promise.resolve(true)),
  genSalt: jest.fn(() => Promise.resolve('salt')),
  hash: jest.fn(() => Promise.resolve('new-hash')),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/rate-limit', () => ({
  mockLimiterCheck: jest.fn(() => Promise.resolve(true)),
  MongoRateLimiter: jest.fn().mockImplementation(() => ({
    check: jest.requireMock('@/lib/rate-limit').mockLimiterCheck,
  })),
}));

jest.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

describe('reset password route', () => {
  const mockLimiterCheck = jest.requireMock('@/lib/rate-limit').mockLimiterCheck as jest.Mock;

  const createRequest = (body: unknown = {
    email: 'test@example.com',
    otp: '123456',
    newPassword: 'Password123!',
  }) => {
    return new Request('http://localhost/api/auth/reset-password', {
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
    mockLimiterCheck.mockResolvedValue(true);
    mockSave.mockResolvedValue(undefined);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
    (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
    (User.findOne as jest.Mock).mockResolvedValue({
      resetPasswordToken: 'hashed-otp',
      save: mockSave,
    });
  });

  it('compares the OTP hash and resets the password', async () => {
    const res = await POST(createRequest());

    expect(res.status).toBe(200);
    expect(bcrypt.compare).toHaveBeenCalledWith('123456', 'hashed-otp');
    expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 'salt');
    expect(mockSave).toHaveBeenCalledTimes(1);
    await expect(res.json()).resolves.toEqual({
      msg: 'Password has been reset successfully.',
      data: null,
    });
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await POST(createRequest('{bad-json'));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ msg: 'Invalid JSON body.' });
  });

  it('returns 400 when the OTP format is invalid', async () => {
    const res = await POST(createRequest({ email: 'test@example.com', otp: 'abc', newPassword: 'Password123!' }));

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ msg: 'Invalid OTP or expired.' });
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('returns 400 when the OTP hash does not match', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const res = await POST(createRequest());

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ msg: 'Invalid OTP or expired.' });
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('rate limits reset attempts', async () => {
    mockLimiterCheck.mockResolvedValue(false);

    const res = await POST(createRequest());

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toEqual({
      msg: 'Too many reset attempts. Please try again later.',
    });
  });
});
