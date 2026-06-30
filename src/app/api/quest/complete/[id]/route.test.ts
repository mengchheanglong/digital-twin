import mongoose from 'mongoose';
import { PUT } from './route';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { adjustUserXP } from '@/lib/user-progress';
import { updateUserInsight } from '@/lib/insight-engine';
import Quest from '@/lib/models/Quest';
import QuestLog from '@/lib/models/QuestLog';
import UserEvent from '@/lib/models/UserEvent';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/auth', () => ({
  verifyTokenWithRevocation: jest.fn(),
}));

jest.mock('@/lib/user-progress', () => ({
  adjustUserXP: jest.fn(() => Promise.resolve({ level: 1, currentXP: 10, requiredXP: 100 })),
}));

jest.mock('@/lib/insight-engine', () => ({
  updateUserInsight: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@/lib/models/Quest', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
    findByIdAndDelete: jest.fn(),
  },
}));

jest.mock('@/lib/models/QuestLog', () => ({
  __esModule: true,
  default: {
    findOneAndUpdate: jest.fn(() => Promise.resolve(null)),
  },
}));

jest.mock('@/lib/models/UserEvent', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => Promise.resolve(null)),
  },
}));

describe('quest completion route', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const questId = new mongoose.Types.ObjectId().toString();
  const user = { id: userId, _id: userId };

  beforeEach(() => {
    jest.clearAllMocks();
    (verifyTokenWithRevocation as jest.Mock).mockResolvedValue(user);
    (adjustUserXP as jest.Mock).mockResolvedValue({ level: 1, currentXP: 10, requiredXP: 100 });
    (updateUserInsight as jest.Mock).mockResolvedValue(null);
    (QuestLog.findOneAndUpdate as jest.Mock).mockResolvedValue(null);
    (UserEvent.create as jest.Mock).mockResolvedValue(null);
    (Quest.create as jest.Mock).mockResolvedValue(null);
  });

  it('returns 409 instead of awarding XP when the quest changed concurrently', async () => {
    (Quest.findOne as jest.Mock).mockResolvedValue({
      _id: questId,
      userId,
      completed: false,
    });
    (Quest.findOneAndUpdate as jest.Mock).mockResolvedValue(null);

    const res = await PUT(new Request('http://localhost/api/quest/complete/id'), {
      params: Promise.resolve({ id: questId }),
    });

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      msg: 'Quest was updated by another request. Please retry.',
    });
    expect(adjustUserXP).not.toHaveBeenCalled();
  });

  it('completes a recurring non-daily quest through a guarded update before applying rewards', async () => {
    const completedDate = new Date('2026-06-24T00:00:00.000Z');
    const quest = {
      _id: questId,
      userId,
      goal: 'Read',
      duration: 'weekly',
      completed: true,
      progress: 100,
      completedDate,
      date: new Date('2026-06-23T00:00:00.000Z'),
    };

    (Quest.findOne as jest.Mock)
      .mockResolvedValueOnce({ ...quest, completed: false, progress: 0, completedDate: null })
      .mockResolvedValueOnce(null);
    (Quest.findOneAndUpdate as jest.Mock).mockResolvedValue(quest);

    const res = await PUT(new Request('http://localhost/api/quest/complete/id'), {
      params: Promise.resolve({ id: questId }),
    });

    expect(res.status).toBe(200);
    expect(Quest.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: questId, userId, completed: false },
      {
        $set: {
          completed: true,
          progress: 100,
          completedDate: expect.any(Date),
        },
      },
      { new: true },
    );
    expect(QuestLog.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(Quest.create).toHaveBeenCalledTimes(1);
    expect(adjustUserXP).toHaveBeenCalledTimes(1);
    await expect(res.json()).resolves.toMatchObject({
      msg: 'Quest completed.',
      progression: { level: 1, currentXP: 10, requiredXP: 100 },
    });
  });

  it('does not create a future clone for daily quests because reset owns that lifecycle', async () => {
    const quest = {
      _id: questId,
      userId,
      goal: 'Read',
      duration: 'daily',
      completed: true,
      progress: 100,
      completedDate: new Date('2026-06-24T00:00:00.000Z'),
      date: new Date('2026-06-23T00:00:00.000Z'),
    };

    (Quest.findOne as jest.Mock).mockResolvedValue({ ...quest, completed: false, progress: 0, completedDate: null });
    (Quest.findOneAndUpdate as jest.Mock).mockResolvedValue(quest);

    const res = await PUT(new Request('http://localhost/api/quest/complete/id'), {
      params: Promise.resolve({ id: questId }),
    });

    expect(res.status).toBe(200);
    expect(QuestLog.findOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(Quest.create).not.toHaveBeenCalled();
    expect(Quest.findByIdAndDelete).not.toHaveBeenCalled();
    expect(adjustUserXP).toHaveBeenCalledTimes(1);
    await expect(res.json()).resolves.toMatchObject({
      msg: 'Quest completed.',
      progression: { level: 1, currentXP: 10, requiredXP: 100 },
    });
  });
});
