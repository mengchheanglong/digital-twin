import bcrypt from 'bcryptjs';
import User from '@/lib/models/User';
import { sendEmail } from '@/lib/email';
import { POST } from './route';

const mockSave = jest.fn(() => Promise.resolve());

jest.mock('bcryptjs', () => ({
  hash: jest.fn(() => Promise.resolve('hashed-otp')),
}));

jest.mock('crypto', () => ({
  randomInt: jest.fn(() => 123456),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/email', () => ({
  sendEmail: jest.fn(() => Promise.resolve({ success: true })),
}));

jest.mock('@/lib/rate-limit', () => ({
  MongoRateLimiter: jest.fn().mockImplementation(() => ({
    check: jest.fn(() => Promise.resolve(true)),
  })),
}));

jest.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

describe('forgot password route', () => {
  function createRequest(email = 'test@example.com') {
    return new Request('http://localhost/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '1.2.3.4',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-otp');
    (sendEmail as jest.Mock).mockResolvedValue({ success: true });
  });

  it('returns the same success response whether or not the account exists', async () => {
    (User.findOne as jest.Mock).mockResolvedValueOnce(null);
    const missingRes = await POST(createRequest('missing@example.com'));
    const missingBody = await missingRes.json();

    (User.findOne as jest.Mock).mockResolvedValueOnce({
      email: 'test@example.com',
      save: mockSave,
    });
    const existingRes = await POST(createRequest('test@example.com'));
    const existingBody = await existingRes.json();

    expect(missingRes.status).toBe(200);
    expect(existingRes.status).toBe(200);
    expect(existingBody).toEqual(missingBody);
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });
});
