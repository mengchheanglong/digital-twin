import { buildProfile } from './profile-service';
import User from '@/lib/models/User';
import Quest from '@/lib/models/Quest';
import CheckIn from '@/lib/models/CheckIn';

jest.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock('@/lib/models/Quest', () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn(),
  },
}));

jest.mock('@/lib/models/CheckIn', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

function userFindChain(value: unknown) {
  const chain: any = {};
  chain.select = jest.fn(() => chain);
  chain.lean = jest.fn(() => Promise.resolve(value));
  return chain;
}

function checkInFindChain(value: unknown[]) {
  const chain: any = {};
  chain.sort = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.lean = jest.fn(() => Promise.resolve(value));
  return chain;
}

describe('buildProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Quest.countDocuments as jest.Mock).mockResolvedValue(0);
    (CheckIn.find as jest.Mock).mockReturnValue(checkInFindChain([]));
    (CheckIn.countDocuments as jest.Mock).mockResolvedValue(0);
    (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);
  });

  it('includes the stored timezone for profile editing', async () => {
    const findChain = userFindChain({
      _id: '64b7f37d5f8d9f0012345678',
      name: 'Timezone Tester',
      age: 25,
      email: 'tester@example.com',
      location: 'Unknown',
      bio: 'Testing profile data.',
      level: 1,
      currentXP: 0,
      requiredXP: 100,
      badges: [],
      avatarStage: 'Focused Strategist',
      joinDate: new Date('2026-01-01T00:00:00.000Z'),
      timezone: 'America/New_York',
    });
    (User.findById as jest.Mock).mockReturnValue(findChain);

    const profile = await buildProfile('64b7f37d5f8d9f0012345678');

    expect(profile?.timezone).toBe('America/New_York');
    expect(findChain.select).toHaveBeenCalledWith(
      'name age email location bio level currentXP requiredXP badges avatarStage joinDate timezone',
    );
  });
});
