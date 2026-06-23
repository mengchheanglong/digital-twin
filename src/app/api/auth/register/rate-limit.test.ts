import bcrypt from 'bcryptjs';
import User from '@/lib/models/User';
import { POST } from './route';

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

jest.mock('@/lib/models/User', () => {
  const UserMock = jest.fn().mockImplementation(function UserModel(this: any, data: any) {
    Object.assign(this, data, {
      id: 'mock-user-id',
      save: jest.fn(() => Promise.resolve()),
    });
  });
  (UserMock as any).findOne = jest.fn(() => Promise.resolve(null));

  return {
    __esModule: true,
    default: UserMock,
  };
});

describe('Registration rate limiting', () => {
  const createRequest = (ip: string) => {
    return new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: {
        'x-forwarded-for': ip,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'test@example.com', password: 'Password123!' }),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (User.findOne as jest.Mock).mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
  });

  it('allows up to 5 requests and then blocks the 6th from the same IP', async () => {
    const ip = '1.2.3.4';

    for (let i = 0; i < 5; i++) {
      const res = await POST(createRequest(ip));
      expect(res.status).not.toBe(429);
    }

    const res6 = await POST(createRequest(ip));
    expect(res6.status).toBe(429);
    await expect(res6.json()).resolves.toEqual({
      msg: 'Too many registration attempts. Please try again later.',
    });
  });

  it('allows requests from different IPs', async () => {
    const res = await POST(createRequest('5.6.7.8'));

    expect(res.status).not.toBe(429);
  });
});
