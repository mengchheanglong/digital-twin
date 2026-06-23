import { sendEmail } from './email';

describe('sendEmail logging', () => {
  const originalEnv = process.env.NODE_ENV;
  const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
    consoleSpy.mockRestore();
  });

  it('logs HTML content in development environment', async () => {
    // @ts-ignore
    process.env.NODE_ENV = 'development';

    await sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      html: '<p>Sensitive Content</p>'
    });

    expect(consoleSpy).toHaveBeenCalledWith('HTML Content:');
    expect(consoleSpy).toHaveBeenCalledWith('<p>Sensitive Content</p>');
    expect(consoleSpy).toHaveBeenCalledWith('Text Preview:', 'Sensitive Content');
  });

  it('does NOT log HTML content in production environment', async () => {
    // @ts-ignore
    process.env.NODE_ENV = 'production';

    await sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      html: '<p>Sensitive Content</p>'
    });

    expect(consoleSpy).not.toHaveBeenCalledWith('HTML Content:');
    expect(consoleSpy).not.toHaveBeenCalledWith('<p>Sensitive Content</p>');
    expect(consoleSpy).not.toHaveBeenCalledWith('Text Preview:', 'Sensitive Content');
    expect(consoleSpy).toHaveBeenCalledWith('[Sensitive HTML Content Hidden]');
  });

  it('does NOT log HTML content in test environment', async () => {
    // @ts-ignore
    process.env.NODE_ENV = 'test';

    await sendEmail({
      to: 'test@example.com',
      subject: 'Test Subject',
      html: '<p>Sensitive Content</p>'
    });

    expect(consoleSpy).not.toHaveBeenCalledWith('HTML Content:');
    expect(consoleSpy).not.toHaveBeenCalledWith('<p>Sensitive Content</p>');
    expect(consoleSpy).not.toHaveBeenCalledWith('Text Preview:', 'Sensitive Content');
    expect(consoleSpy).toHaveBeenCalledWith('[Sensitive HTML Content Hidden]');
  });
});
