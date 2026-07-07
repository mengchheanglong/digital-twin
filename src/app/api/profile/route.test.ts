import { PUT } from './route';
import User from '@/lib/models/User';

const userId = '64b7f37d5f8d9f0012345678';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/auth', () => ({
  withAuth:
    (handler: any) =>
    (req: Request, context: unknown) =>
      handler(req, context, { id: userId, _id: userId }),
}));

jest.mock('@/lib/profile-service', () => ({
  buildProfile: jest.fn(),
}));

jest.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findByIdAndUpdate: jest.fn(),
  },
}));

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('profile route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects invalid IANA timezones before saving profile updates', async () => {
    const res = await PUT(jsonRequest({ name: 'Timezone Tester', timezone: 'Not/A_Real_Zone' }), {});
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.msg).toBe('Timezone must be a valid IANA timezone.');
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('persists valid IANA timezones', async () => {
    (User.findByIdAndUpdate as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: userId,
        name: 'Timezone Tester',
        timezone: 'America/New_York',
      }),
    });

    const res = await PUT(jsonRequest({ name: 'Timezone Tester', timezone: 'America/New_York' }), {});
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      userId,
      { $set: { name: 'Timezone Tester', timezone: 'America/New_York' } },
      { new: true, select: 'name bio location age timezone avatarStage' },
    );
    expect(body.profile.timezone).toBe('America/New_York');
  });
});
