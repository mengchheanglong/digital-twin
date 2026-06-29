import { verifyTokenWithRevocation } from '@/lib/auth';
import { requestDeepSeekChat } from '@/lib/deepseek';
import { buildTwinContextPack } from '@/lib/twin-core';
import ChatConversation from '@/lib/models/ChatConversation';
import ChatMessage from '@/lib/models/ChatMessage';
import ChatSignal from '@/lib/models/ChatSignal';
import UserInsightState from '@/lib/models/UserInsightState';
import { POST } from './route';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/auth', () => ({
  verifyTokenWithRevocation: jest.fn(),
}));

jest.mock('@/lib/rate-limit', () => ({
  MongoRateLimiter: jest.fn().mockImplementation(() => ({
    check: jest.fn(() => Promise.resolve(true)),
  })),
}));

jest.mock('@/lib/deepseek', () => ({
  requestDeepSeekChat: jest.fn(),
  resolveDeepSeekModelCandidates: jest.fn(() => ['deepseek-test']),
}));

jest.mock('@/lib/twin-core', () => ({
  buildTwinContextPack: jest.fn(),
}));

jest.mock('@/lib/memory-engine', () => ({
  getUserMemoryContext: jest.fn(() => Promise.resolve('Legacy memory prefers morning planning.')),
}));

jest.mock('@/lib/insight-engine', () => ({
  updateUserInsight: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@/lib/models/ChatConversation', () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(() => Promise.resolve(null)),
  },
}));

jest.mock('@/lib/models/ChatMessage', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    insertMany: jest.fn(() => Promise.resolve([])),
  },
}));

jest.mock('@/lib/models/ChatSignal', () => ({
  __esModule: true,
  default: {
    countDocuments: jest.fn(() => Promise.resolve(20)),
    bulkWrite: jest.fn(() => Promise.resolve({})),
  },
}));

jest.mock('@/lib/models/UserInsightState', () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
  },
}));

jest.mock('@/lib/models/UserEvent', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => Promise.resolve({})),
  },
}));

const userId = '64b7f37d5f8d9f0012345678';
const chatId = '64b7f37d5f8d9f0012345679';

function createRequest() {
  return new Request('http://localhost/api/chat/send', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer test-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: 'I need help making a grounded plan.' }),
  });
}

describe('chat send route', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    (verifyTokenWithRevocation as jest.Mock).mockResolvedValue({
      id: userId,
      _id: userId,
      email: 'user@example.com',
    });
    (buildTwinContextPack as jest.Mock).mockRejectedValue(new Error('context unavailable'));
    (requestDeepSeekChat as jest.Mock).mockResolvedValue({
      text: 'Start with one small practical step today, then reflect afterward.',
      model: 'deepseek-test',
      finishReason: 'stop',
    });
    (ChatConversation.create as jest.Mock).mockResolvedValue({ _id: chatId });
    (ChatMessage.insertMany as jest.Mock).mockResolvedValue([]);
    (ChatSignal.countDocuments as jest.Mock).mockResolvedValue(20);
    (UserInsightState.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn(() =>
        Promise.resolve({
          topInterest: 'planning',
          currentTrend: 'stable',
          entertainmentRatio: 0.1,
          lastReflection: 'Small steps helped.',
        }),
      ),
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('fails open when Twin context cannot be built and preserves chat response schema', async () => {
    const res = await POST(createRequest());

    expect(verifyTokenWithRevocation).toHaveBeenCalled();
    expect(buildTwinContextPack).toHaveBeenCalledWith(userId);
    expect(requestDeepSeekChat).toHaveBeenCalled();
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(Object.keys(json).sort()).toEqual([
      'chatId',
      'extractedSignals',
      'messages',
      'model',
      'reply',
    ]);
    expect(json).toMatchObject({
      reply: 'Start with one small practical step today, then reflect afterward.',
      chatId,
      model: 'deepseek-test',
      extractedSignals: [],
    });
    expect(json.messages).toHaveLength(2);

    const deepSeekPayload = (requestDeepSeekChat as jest.Mock).mock.calls[0][0];
    const systemPrompt = deepSeekPayload.messages.find((message: { role: string }) => message.role === 'system').content;

    expect(systemPrompt).not.toContain('=== TWIN CONTEXT ===');
    expect(systemPrompt).toContain('Do not fabricate personal history');
    expect(systemPrompt).toContain('Do not provide medical diagnosis, legal advice, or financial advice');
  });
});
