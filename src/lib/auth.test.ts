import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dbConnect from './db';
import User from './models/User';
import { verifyToken, verifyTokenWithRevocation } from './auth';

jest.mock('./db', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

jest.mock('./models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

describe('auth token verification', () => {
  const secret = 'test-secret-with-enough-length';

  function requestWithToken(token: string) {
    return new Request('http://localhost/api/test', {
      headers: { authorization: `Bearer ${token}` },
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = secret;
  });

  it('rejects tokens without a valid Mongo user id', async () => {
    const token = jwt.sign({ user: { id: 'not-an-object-id' } }, secret);
    const req = requestWithToken(token);

    expect(verifyToken(req)).toBeNull();
    await expect(verifyTokenWithRevocation(req)).resolves.toBeNull();
    expect(dbConnect).not.toHaveBeenCalled();
  });

  it('rejects tokens when revocation state cannot be checked', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const userId = new mongoose.Types.ObjectId().toString();
    const token = jwt.sign({ user: { id: userId } }, secret);
    (dbConnect as jest.Mock).mockRejectedValueOnce(new Error('database unavailable'));

    await expect(verifyTokenWithRevocation(requestWithToken(token))).resolves.toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      'Token revocation check failed:',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it('rejects tokens issued before the last password change', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = jwt.sign({ user: { id: userId }, iat: 1000 }, secret);
    (User.findById as jest.Mock).mockReturnValue({
      lean: jest.fn(() => Promise.resolve({ passwordChangedAt: new Date(1001 * 1000) })),
    });

    await expect(verifyTokenWithRevocation(requestWithToken(token))).resolves.toBeNull();
  });

  it('accepts tokens issued in the same second as the password change', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = jwt.sign({ user: { id: userId }, iat: 1000 }, secret);
    (User.findById as jest.Mock).mockReturnValue({
      lean: jest.fn(() => Promise.resolve({ passwordChangedAt: new Date(1000 * 1000 + 900) })),
    });

    await expect(verifyTokenWithRevocation(requestWithToken(token))).resolves.toEqual({
      id: userId,
      _id: userId,
    });
  });

  it('rejects tokens when the user no longer exists', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = jwt.sign({ user: { id: userId } }, secret);
    (User.findById as jest.Mock).mockReturnValue({
      lean: jest.fn(() => Promise.resolve(null)),
    });

    await expect(verifyTokenWithRevocation(requestWithToken(token))).resolves.toBeNull();
  });

  it('normalizes valid token users', async () => {
    const userId = new mongoose.Types.ObjectId().toString();
    const token = jwt.sign({ user: { _id: userId, email: 'test@example.com' } }, secret);
    (User.findById as jest.Mock).mockReturnValue({
      lean: jest.fn(() => Promise.resolve({ passwordChangedAt: null })),
    });

    await expect(verifyTokenWithRevocation(requestWithToken(token))).resolves.toEqual({
      id: userId,
      _id: userId,
      email: 'test@example.com',
    });
  });
});
