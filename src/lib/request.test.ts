import {
  boundedNumber,
  getClientIp,
  oneOf,
  optionalString,
  parseBoundedInt,
  readJsonBody,
  requiredString,
  validateFields,
} from './request';

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

  it('trims required strings and rejects empty values', () => {
    expect(requiredString('Name')('  Ada  ')).toEqual({ ok: true, value: 'Ada' });
    expect(requiredString('Name')('   ')).toEqual({ ok: false, message: 'Name is required.' });
  });

  it('returns stable min and max length string messages', () => {
    expect(requiredString('Password', { minLength: 6 })('abc')).toEqual({
      ok: false,
      message: 'Password must be at least 6 characters.',
    });
    expect(requiredString('Display name', { maxLength: 5 })('abcdef')).toEqual({
      ok: false,
      message: 'Display name must be at most 5 characters.',
    });
  });

  it('allows missing optional strings and validates provided values', () => {
    expect(optionalString('Nickname')(undefined)).toEqual({ ok: true, value: undefined });
    expect(optionalString('Nickname', { maxLength: 3 })('abcd')).toEqual({
      ok: false,
      message: 'Nickname must be at most 3 characters.',
    });
  });

  it('rejects invalid and out-of-range bounded numbers', () => {
    expect(boundedNumber('Age', { min: 1, max: 120, integer: true })('abc')).toEqual({
      ok: false,
      message: 'Age must be a number.',
    });
    expect(boundedNumber('Age', { min: 1, max: 120, integer: true })(1.5)).toEqual({
      ok: false,
      message: 'Age must be an integer.',
    });
    expect(boundedNumber('Age', { min: 1, max: 120 })(121)).toEqual({
      ok: false,
      message: 'Age must be between 1 and 120.',
    });
  });

  it('rejects unsupported oneOf values', () => {
    expect(oneOf('Mode', ['daily', 'weekly'] as const)('monthly')).toEqual({
      ok: false,
      message: 'Mode must be one of: daily, weekly.',
    });
  });

  it('validates field schemas and returns badRequest responses for the first error', async () => {
    const ok = validateFields(
      { email: ' test@example.com ', count: '3', mode: 'daily' },
      {
        email: requiredString('Email'),
        count: boundedNumber('Count', { min: 1, max: 5, integer: true }),
        mode: oneOf('Mode', ['daily', 'weekly'] as const),
      },
    );

    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.data).toEqual({ email: 'test@example.com', count: 3, mode: 'daily' });
    }

    const failed = validateFields({ email: '' }, { email: requiredString('Email') });
    expect(failed.ok).toBe(false);
    if (!failed.ok) {
      expect(failed.response.status).toBe(400);
      await expect(failed.response.json()).resolves.toEqual({ msg: 'Email is required.' });
    }
  });
});
