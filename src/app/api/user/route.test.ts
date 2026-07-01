import mongoose from 'mongoose';
import BurnoutHistory from '@/lib/models/BurnoutHistory';
import ChatConversation from '@/lib/models/ChatConversation';
import ChatMessage from '@/lib/models/ChatMessage';
import ChatSignal from '@/lib/models/ChatSignal';
import CheckIn from '@/lib/models/CheckIn';
import FocusSession from '@/lib/models/FocusSession';
import JournalEntry from '@/lib/models/JournalEntry';
import LifeEvent from '@/lib/models/LifeEvent';
import Quest from '@/lib/models/Quest';
import QuestLog from '@/lib/models/QuestLog';
import User from '@/lib/models/User';
import UserEvent from '@/lib/models/UserEvent';
import UserInsightState from '@/lib/models/UserInsightState';
import UserMemory from '@/lib/models/UserMemory';
import { DELETE } from './route';

const mockUserId = '64b7f37d5f8d9f0012345678';

jest.mock('@/lib/auth', () => ({
  withAuth:
    (handler: Function) =>
    (req: Request, context: unknown = {}) =>
      handler(req, context, { id: mockUserId, _id: mockUserId }),
}));

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

function mockModelDelete(method = 'deleteMany') {
  return {
    __esModule: true,
    default: {
      [method]: jest.fn(() => Promise.resolve({ deletedCount: 1 })),
    },
  };
}

jest.mock('@/lib/models/BurnoutHistory', () => mockModelDelete());
jest.mock('@/lib/models/ChatConversation', () => mockModelDelete());
jest.mock('@/lib/models/ChatMessage', () => mockModelDelete());
jest.mock('@/lib/models/ChatSignal', () => mockModelDelete());
jest.mock('@/lib/models/CheckIn', () => mockModelDelete());
jest.mock('@/lib/models/FocusSession', () => mockModelDelete());
jest.mock('@/lib/models/JournalEntry', () => mockModelDelete());
jest.mock('@/lib/models/LifeEvent', () => mockModelDelete());
jest.mock('@/lib/models/Quest', () => mockModelDelete());
jest.mock('@/lib/models/QuestLog', () => mockModelDelete());
jest.mock('@/lib/models/User', () => mockModelDelete('deleteOne'));
jest.mock('@/lib/models/UserEvent', () => mockModelDelete());
jest.mock('@/lib/models/UserInsightState', () => mockModelDelete());
jest.mock('@/lib/models/UserMemory', () => mockModelDelete());

describe('user erasure route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes every user-owned collection, including newer analytics and memory data', async () => {
    const res = await DELETE(new Request('http://localhost/api/user', { method: 'DELETE' }));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      message: 'Account and all associated data have been deleted.',
    });

    const objectIdModels = [
      CheckIn,
      Quest,
      QuestLog,
      JournalEntry,
      FocusSession,
      LifeEvent,
      BurnoutHistory,
      UserEvent,
      UserInsightState,
      UserMemory,
    ];

    for (const model of objectIdModels) {
      const query = (model.deleteMany as jest.Mock).mock.calls[0][0];
      expect(String(query.userId)).toBe(mockUserId);
    }

    for (const model of [ChatMessage, ChatConversation, ChatSignal]) {
      expect(model.deleteMany).toHaveBeenCalledWith({ userId: mockUserId });
    }

    expect(User.deleteOne).toHaveBeenCalledWith({
      _id: new mongoose.Types.ObjectId(mockUserId),
    });
  });
});
