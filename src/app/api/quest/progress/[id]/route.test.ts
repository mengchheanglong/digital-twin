import mongoose from 'mongoose';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { adjustUserXP } from '@/lib/user-progress';
import Quest from '@/lib/models/Quest';
import { PUT } from './route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/auth', () => ({
  verifyTokenWithRevocation: jest.fn(),
}));

jest.mock('@/lib/user-progress', () => ({
  adjustUserXP: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@/lib/models/Quest', () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
  },
}));

describe('quest progress route', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const questId = new mongoose.Types.ObjectId().toString();
  const user = { id: userId, _id: userId };

  function createRequest(progress: unknown) {
    return new Request('http://localhost/api/quest/progress/id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress }),
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (verifyTokenWithRevocation as jest.Mock).mockResolvedValue(user);
  });

  it('does not complete or award XP when progress reaches 100', async () => {
    const updatedQuest = {
      _id: questId,
      userId,
      goal: 'Read',
      duration: 'daily',
      progress: 100,
      completed: false,
      completedDate: null,
    };
    (Quest.findOneAndUpdate as jest.Mock).mockResolvedValue(updatedQuest);

    const res = await PUT(createRequest(100), {
      params: Promise.resolve({ id: questId }),
    });

    expect(res.status).toBe(200);
    expect(Quest.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: questId, userId, completed: false },
      {
        $set: {
          progress: 100,
        },
      },
      { new: true },
    );
    expect(Quest.findOne).not.toHaveBeenCalled();
    expect(adjustUserXP).not.toHaveBeenCalled();
    await expect(res.json()).resolves.toMatchObject({
      msg: 'Progress updated.',
      quest: updatedQuest,
      progression: null,
    });
  });
});
