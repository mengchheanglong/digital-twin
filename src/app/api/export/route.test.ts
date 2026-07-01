import { verifyTokenWithRevocation } from '@/lib/auth';
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
import { GET } from './route';

const userId = '64b7f37d5f8d9f0012345678';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/auth', () => ({
  verifyTokenWithRevocation: jest.fn(),
}));

function sortedFindChain(rows: unknown[]) {
  return {
    sort: jest.fn(() => ({
      lean: jest.fn(() => Promise.resolve(rows)),
    })),
  };
}

function findOneChain(value: unknown) {
  return {
    lean: jest.fn(() => Promise.resolve(value)),
  };
}

jest.mock('@/lib/models/BurnoutHistory', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock('@/lib/models/ChatConversation', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock('@/lib/models/ChatMessage', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock('@/lib/models/ChatSignal', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock('@/lib/models/CheckIn', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock('@/lib/models/FocusSession', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock('@/lib/models/JournalEntry', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock('@/lib/models/LifeEvent', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock('@/lib/models/Quest', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock('@/lib/models/QuestLog', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: { findById: jest.fn() },
}));
jest.mock('@/lib/models/UserEvent', () => ({
  __esModule: true,
  default: { find: jest.fn() },
}));
jest.mock('@/lib/models/UserInsightState', () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));
jest.mock('@/lib/models/UserMemory', () => ({
  __esModule: true,
  default: { findOne: jest.fn() },
}));

describe('data export route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyTokenWithRevocation as jest.Mock).mockResolvedValue({ id: userId, _id: userId });
    (User.findById as jest.Mock).mockReturnValue({
      select: jest.fn(() => ({
        lean: jest.fn(() =>
          Promise.resolve({
            _id: userId,
            email: 'user@example.com',
            name: 'User',
          }),
        ),
      })),
    });

    (CheckIn.find as jest.Mock).mockReturnValue(sortedFindChain([{ type: 'check-in' }]));
    (Quest.find as jest.Mock).mockReturnValue(sortedFindChain([{ goal: 'Read' }]));
    (QuestLog.find as jest.Mock).mockReturnValue(sortedFindChain([{ goal: 'Read', completed: true }]));
    (JournalEntry.find as jest.Mock).mockReturnValue(sortedFindChain([{ title: 'Journal' }]));
    (FocusSession.find as jest.Mock).mockReturnValue(sortedFindChain([{ durationMinutes: 25 }]));
    (LifeEvent.find as jest.Mock).mockReturnValue(sortedFindChain([{ title: 'Moved cities' }]));
    (BurnoutHistory.find as jest.Mock).mockReturnValue(sortedFindChain([{ stage: 'tiring' }]));
    (UserEvent.find as jest.Mock).mockReturnValue(sortedFindChain([{ type: 'quest_completed' }]));
    (ChatConversation.find as jest.Mock).mockReturnValue(sortedFindChain([{ title: 'Planning' }]));
    (ChatMessage.find as jest.Mock).mockReturnValue(sortedFindChain([{ role: 'user', content: 'Hello' }]));
    (ChatSignal.find as jest.Mock).mockReturnValue(sortedFindChain([{ signalType: 'stress' }]));
    (UserInsightState.findOne as jest.Mock).mockReturnValue(findOneChain({ currentTrend: 'stable' }));
    (UserMemory.findOne as jest.Mock).mockReturnValue(findOneChain({ summary: 'Weekly pattern' }));
  });

  it('includes all user-owned data collections without profile secrets', async () => {
    const res = await GET(new Request('http://localhost/api/export'));

    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json).toMatchObject({
      profile: {
        email: 'user@example.com',
        name: 'User',
      },
      checkIns: [{ type: 'check-in' }],
      quests: [{ goal: 'Read' }],
      questLogs: [{ goal: 'Read', completed: true }],
      journals: [{ title: 'Journal' }],
      focusSessions: [{ durationMinutes: 25 }],
      lifeEvents: [{ title: 'Moved cities' }],
      burnoutHistory: [{ stage: 'tiring' }],
      userEvents: [{ type: 'quest_completed' }],
      insightState: { currentTrend: 'stable' },
      userMemory: { summary: 'Weekly pattern' },
      chatConversations: [{ title: 'Planning' }],
      chatMessages: [{ role: 'user', content: 'Hello' }],
      chatSignals: [{ signalType: 'stress' }],
    });

    const serialized = JSON.stringify(json);
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('resetPasswordToken');
  });
});
