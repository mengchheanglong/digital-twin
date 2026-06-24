import User from '@/lib/models/User';
import { adjustUserXP } from './user-progress';

jest.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

function leanChain<T>(value: T) {
  return {
    select: jest.fn(() => ({
      lean: jest.fn(() => Promise.resolve(value)),
    })),
  };
}

describe('adjustUserXP', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when the user does not exist', async () => {
    (User.findById as jest.Mock).mockReturnValue(leanChain(null));

    await expect(adjustUserXP('missing-user', 10)).resolves.toBeNull();
    expect(User.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('retries when another request updates XP first', async () => {
    (User.findById as jest.Mock)
      .mockReturnValueOnce(leanChain({ level: 1, currentXP: 0, requiredXP: 100 }))
      .mockReturnValueOnce(leanChain({ level: 1, currentXP: 20, requiredXP: 100 }));

    (User.findOneAndUpdate as jest.Mock)
      .mockReturnValueOnce(leanChain(null))
      .mockReturnValueOnce(leanChain({ level: 1, currentXP: 50, requiredXP: 100 }));

    await expect(adjustUserXP('user-id', 30)).resolves.toEqual({
      level: 1,
      currentXP: 50,
      requiredXP: 100,
    });

    expect(User.findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      {
        _id: 'user-id',
        level: 1,
        currentXP: 20,
        requiredXP: 100,
      },
      {
        $set: {
          level: 1,
          currentXP: 50,
          requiredXP: 100,
        },
      },
      { new: true },
    );
  });

  it('throws after repeated concurrent write conflicts', async () => {
    (User.findById as jest.Mock).mockReturnValue(
      leanChain({ level: 1, currentXP: 0, requiredXP: 100 }),
    );
    (User.findOneAndUpdate as jest.Mock).mockReturnValue(leanChain(null));

    await expect(adjustUserXP('user-id', 30)).rejects.toThrow(
      'Unable to update user XP after concurrent modifications.',
    );
    expect(User.findOneAndUpdate).toHaveBeenCalledTimes(3);
  });
});
