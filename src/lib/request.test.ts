import { getClientIp, parseBoundedInt, readJsonBody } from './request';

describe('request helpers', () => {
  it('reads the first forwarded IP address', () => {
    const req = new Request('http://localhost/test', {
      headers: { 'x-forwarded-for': '203.0.113.10, 10.0.0.2' },
    });

    expect(getClientIp(req)).toBe('203.0.113.10');
  });

  it('falls back to x-real-ip and then unknown', () => {
    const realIpReq = new Request('http://localhost/test', {
      headers: { 'x-real-ip': '198.51.100.7' },
    });
    const unknownReq = new Request('http://localhost/test');

    expect(getClientIp(realIpReq)).toBe('198.51.100.7');
    expect(getClientIp(unknownReq)).toBe('unknown');
  });

  it('returns a bad request response for malformed JSON', async () => {
    const req = new Request('http://localhost/test', {
      method: 'POST',
      body: '{bad-json',
    });

    const result = await readJsonBody(req);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      await expect(result.response.json()).resolves.toEqual({ msg: 'Invalid JSON body.' });
    }
  });

  it('clamps bounded integer values', () => {
    expect(parseBoundedInt('999', { defaultValue: 20, min: 1, max: 100 })).toBe(100);
    expect(parseBoundedInt('-5', { defaultValue: 20, min: 1, max: 100 })).toBe(1);
    expect(parseBoundedInt('abc', { defaultValue: 20, min: 1, max: 100 })).toBe(20);
  });
});
