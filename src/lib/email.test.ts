import { sendEmail } from './email';

describe('sendEmail logging', () => {
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  it('returns success without logging sensitive email fields', async () => {
    const to = 'test@example.com';
    const subject = 'Reset code';
    const html = '<p>Secret OTP 123456</p>';

    const result = await sendEmail({ to, subject, html });
    const combinedLogs = consoleSpy.mock.calls.map((call) => call.join(' ')).join('\n');

    expect(result).toEqual({ success: true });
    expect(combinedLogs).not.toContain(to);
    expect(combinedLogs).not.toContain(subject);
    expect(combinedLogs).not.toContain(html);
    expect(combinedLogs).not.toContain('123456');
    expect(consoleSpy).toHaveBeenCalledWith('Email simulated (simplified mode). Sensitive fields are not logged.');
  });
});
