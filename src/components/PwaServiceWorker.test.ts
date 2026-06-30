import { shouldRegisterServiceWorker } from './PwaServiceWorker';

describe('shouldRegisterServiceWorker', () => {
  it('allows service worker registration on HTTPS deployments', () => {
    expect(
      shouldRegisterServiceWorker({ protocol: 'https:', hostname: 'digital-twin.vercel.app' }, true),
    ).toBe(true);
  });

  it('allows service worker registration on localhost for local testing', () => {
    expect(shouldRegisterServiceWorker({ protocol: 'http:', hostname: 'localhost' }, true)).toBe(true);
    expect(shouldRegisterServiceWorker({ protocol: 'http:', hostname: '127.0.0.1' }, true)).toBe(true);
  });

  it('does not register service workers on insecure non-local origins', () => {
    expect(shouldRegisterServiceWorker({ protocol: 'http:', hostname: 'example.com' }, true)).toBe(false);
  });

  it('does not register when the browser lacks service worker support', () => {
    expect(shouldRegisterServiceWorker({ protocol: 'https:', hostname: 'digital-twin.vercel.app' }, false)).toBe(false);
  });
});
