import { sanitizeStringArray, sanitizeText } from './sanitize';

describe('twin-core sanitizeText', () => {
  it('redacts generic token key-value secrets in text and URLs', () => {
    const token = 'abc123xyz789';

    expect(sanitizeText(`bio token=${token}`)).toBe('bio token=[redacted-secret]');
    expect(sanitizeText(`https://x.test/?token=${token}&next=ok`)).toBe(
      'https://x.test/?token=[redacted-secret]&next=ok',
    );
  });

  it('redacts camelCase and jwt key-value secrets', () => {
    const sensitiveValue = 'abc123xyz789';

    expect(sanitizeText(`apiKey: ${sensitiveValue}`)).toBe('apiKey=[redacted-secret]');
    expect(sanitizeText(`jwt=${sensitiveValue}`)).toBe('jwt=[redacted-secret]');
  });

  it('redacts emails, bearer tokens, and common token-like values', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature123456789';
    const apiKey = 'sk-test_1234567890abcdef';

    const text = sanitizeText(`contact leak@example.com Bearer ${apiKey} jwt ${jwt}`);

    expect(text).toContain('[redacted-email]');
    expect(text).toContain('Bearer [redacted-secret]');
    expect(text).toContain('[redacted-token]');
    expect(text).not.toContain('leak@example.com');
    expect(text).not.toContain(apiKey);
    expect(text).not.toContain(jwt);
  });

  it('applies redaction to sanitized string arrays', () => {
    expect(sanitizeStringArray(['safe', 'token=abc123xyz789'], 10)).toEqual([
      'safe',
      'token=[redacted-secret]',
    ]);
  });
});
