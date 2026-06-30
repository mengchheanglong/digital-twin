import mongoose from 'mongoose';
import { POST } from './route';
import { verifyTokenWithRevocation } from '@/lib/auth';
import Quest from '@/lib/models/Quest';
import QuestLog from '@/lib/models/QuestLog';
import User from '@/lib/models/User';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/auth', () => ({
  verifyTokenWithRevocation: jest.fn(),
}));

jest.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(() => Promise.resolve(null)),
  },
}));

jest.mock('@/lib/models/Quest', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    deleteMany: jest.fn(),
    updateMany: jest.fn(),
  },
}));

jest.mock('@/lib/models/QuestLog', () => ({
  __esModule: true,
  default: {
    bulkWrite: jest.fn(() => Promise.resolve(null)),
  },
}));

type QuestRecord = {
  _id: mongoose.Types.ObjectId;
  userId: string;
  goal: string;
  duration: 'daily' | 'weekly' | 'monthly' | 'yearly';
  progress: number;
  completed: boolean;
  date: Date;
  completedDate: Date | null;
  recurrencesLeft?: number | null;
};

function matchesRecurrenceCondition(quest: QuestRecord, condition: Record<string, any>) {
  if ('recurrencesLeft' in condition) {
    const expected = condition.recurrencesLeft;

    if (expected === null) {
      return quest.recurrencesLeft === null;
    }

    if (expected?.$exists === false) {
      return !Object.prototype.hasOwnProperty.call(quest, 'recurrencesLeft');
    }

    if (typeof expected?.$gt === 'number') {
      return typeof quest.recurrencesLeft === 'number' && quest.recurrencesLeft > expected.$gt;
    }

    if (Array.isArray(expected?.$in)) {
      return expected.$in.includes(quest.recurrencesLeft);
    }

    return quest.recurrencesLeft === expected;
  }

  if (condition._id?.$in) {
    return condition._id.$in.map(String).includes(String(quest._id));
  }

  return false;
}

function matchesResetCompletedQuery(quest: QuestRecord, query: Record<string, any>) {
  if (quest.userId !== query.userId || quest.duration !== query.duration || quest.completed !== query.completed) {
    return false;
  }

  if ('recurrencesLeft' in query && !matchesRecurrenceCondition(quest, query)) {
    return false;
  }

  if (!query.$or) {
    return true;
  }

  return query.$or.some((condition: Record<string, any>) => matchesRecurrenceCondition(quest, condition));
}

function mockQuestStore(quests: QuestRecord[]) {
  (Quest.find as jest.Mock).mockImplementation((query: Record<string, any>) => {
    if (query.completed === true) {
      return Promise.resolve(quests.filter((quest) => quest.completed));
    }

    return Promise.resolve(quests.filter((quest) => !quest.completed));
  });

  (Quest.deleteMany as jest.Mock).mockImplementation((query: Record<string, any>) => {
    const before = quests.length;

    for (let index = quests.length - 1; index >= 0; index -= 1) {
      if (matchesResetCompletedQuery(quests[index], query)) {
        quests.splice(index, 1);
      }
    }

    return Promise.resolve({ deletedCount: before - quests.length });
  });

  (Quest.updateMany as jest.Mock).mockImplementation((query: Record<string, any>, update: Record<string, any>) => {
    let modifiedCount = 0;

    for (const quest of quests) {
      if (matchesResetCompletedQuery(quest, query)) {
        Object.assign(quest, update.$set);
        if (update.$inc?.recurrencesLeft) {
          quest.recurrencesLeft = (quest.recurrencesLeft ?? 0) + update.$inc.recurrencesLeft;
        }
        modifiedCount += 1;
      }
    }

    return Promise.resolve({ modifiedCount });
  });
}

describe('quest reset route', () => {
  const userId = new mongoose.Types.ObjectId().toString();
  const user = { id: userId, _id: userId };
  const baseDate = new Date('2026-06-24T00:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-06-25T01:00:00.000Z'));
    (verifyTokenWithRevocation as jest.Mock).mockResolvedValue(user);
    (User.findById as jest.Mock).mockResolvedValue({
      _id: userId,
      timezone: 'UTC',
      lastQuestResetDate: baseDate,
    });
    (User.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);
    (QuestLog.bulkWrite as jest.Mock).mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('does not reactivate a completed daily quest when its next occurrence already exists', async () => {
    const originalQuestId = new mongoose.Types.ObjectId();
    const futureQuestId = new mongoose.Types.ObjectId();
    const quests: QuestRecord[] = [
      {
        _id: originalQuestId,
        userId,
        goal: 'Read 10 pages',
        duration: 'daily',
        progress: 100,
        completed: true,
        date: new Date('2026-06-24T00:00:00.000Z'),
        completedDate: new Date('2026-06-24T12:00:00.000Z'),
      },
      {
        _id: futureQuestId,
        userId,
        goal: 'Read 10 pages',
        duration: 'daily',
        progress: 0,
        completed: false,
        date: new Date('2026-06-25T00:00:00.000Z'),
        completedDate: null,
      },
    ];

    mockQuestStore(quests);

    const res = await POST(new Request('http://localhost/api/quest/reset', { method: 'POST' }));

    expect(res.status).toBe(200);
    const activeMatchingQuests = quests.filter(
      (quest) =>
        quest.userId === userId &&
        quest.duration === 'daily' &&
        quest.goal.toLowerCase() === 'read 10 pages' &&
        !quest.completed,
    );
    expect(activeMatchingQuests).toHaveLength(1);
    expect(activeMatchingQuests[0]._id).toEqual(futureQuestId);
    expect(QuestLog.bulkWrite).toHaveBeenCalledTimes(1);
  });

  it('reactivates one infinite daily quest when no next occurrence exists', async () => {
    const questId = new mongoose.Types.ObjectId();
    const quests: QuestRecord[] = [
      {
        _id: questId,
        userId,
        goal: 'Stretch',
        duration: 'daily',
        progress: 100,
        completed: true,
        date: new Date('2026-06-24T00:00:00.000Z'),
        completedDate: new Date('2026-06-24T12:00:00.000Z'),
      },
    ];
    mockQuestStore(quests);

    const res = await POST(new Request('http://localhost/api/quest/reset', { method: 'POST' }));

    expect(res.status).toBe(200);
    expect(quests).toHaveLength(1);
    expect(quests[0]).toMatchObject({
      _id: questId,
      completed: false,
      progress: 0,
      completedDate: null,
    });
  });

  it('decrements limited daily recurrence when returning it for the next day', async () => {
    const quests: QuestRecord[] = [
      {
        _id: new mongoose.Types.ObjectId(),
        userId,
        goal: 'Meditate',
        duration: 'daily',
        progress: 100,
        completed: true,
        date: new Date('2026-06-24T00:00:00.000Z'),
        completedDate: new Date('2026-06-24T12:00:00.000Z'),
        recurrencesLeft: 2,
      },
    ];
    mockQuestStore(quests);

    const res = await POST(new Request('http://localhost/api/quest/reset', { method: 'POST' }));

    expect(res.status).toBe(200);
    expect(quests).toHaveLength(1);
    expect(quests[0]).toMatchObject({
      completed: false,
      progress: 0,
      completedDate: null,
      recurrencesLeft: 1,
    });
  });

  it('deletes exhausted daily recurrence after logging completion', async () => {
    const quests: QuestRecord[] = [
      {
        _id: new mongoose.Types.ObjectId(),
        userId,
        goal: 'Journal',
        duration: 'daily',
        progress: 100,
        completed: true,
        date: new Date('2026-06-24T00:00:00.000Z'),
        completedDate: new Date('2026-06-24T12:00:00.000Z'),
        recurrencesLeft: 1,
      },
    ];
    mockQuestStore(quests);

    const res = await POST(new Request('http://localhost/api/quest/reset', { method: 'POST' }));

    expect(res.status).toBe(200);
    expect(quests).toHaveLength(0);
    expect(QuestLog.bulkWrite).toHaveBeenCalledTimes(1);
  });
});
