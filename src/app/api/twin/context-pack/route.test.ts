import { GET } from './route';
import { verifyTokenWithRevocation } from '@/lib/auth';
import { buildTwinContextPack } from '@/lib/twin-core';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/auth', () => ({
  verifyTokenWithRevocation: jest.fn(),
}));

jest.mock('@/lib/twin-core', () => ({
  buildTwinContextPack: jest.fn(),
}));

describe('twin context pack route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    (verifyTokenWithRevocation as jest.Mock).mockResolvedValue(null);

    const res = await GET(new Request('http://localhost/api/twin/context-pack'));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ msg: 'No token, authorization denied.' });
    expect(buildTwinContextPack).not.toHaveBeenCalled();
  });

  it('returns an authenticated no-store context pack response', async () => {
    (verifyTokenWithRevocation as jest.Mock).mockResolvedValue({ id: 'user-123' });
    (buildTwinContextPack as jest.Mock).mockResolvedValue({ version: 'twin-core.v0' });

    const res = await GET(new Request('http://localhost/api/twin/context-pack'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    await expect(res.json()).resolves.toEqual({
      success: true,
      contextPack: { version: 'twin-core.v0' },
    });
    expect(buildTwinContextPack).toHaveBeenCalledWith('user-123');
  });
});
