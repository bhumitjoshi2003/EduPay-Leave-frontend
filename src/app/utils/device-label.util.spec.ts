import { deviceLabel } from './device-label.util';

describe('device-label.util', () => {
  it('labels a macOS Chrome user-agent as "Chrome on macOS"', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
    expect(deviceLabel(ua)).toBe('Chrome on macOS');
  });

  it('labels an iPhone Safari user-agent as "Safari on iPhone"', () => {
    const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
    expect(deviceLabel(ua)).toBe('Safari on iPhone');
  });

  it('labels a mobile Chrome-on-Android user-agent as "Chrome on Android"', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36';
    expect(deviceLabel(ua)).toBe('Chrome on Android');
  });

  it('labels a Windows Firefox user-agent as "Firefox on Windows"', () => {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0';
    expect(deviceLabel(ua)).toBe('Firefox on Windows');
  });

  it('labels a Capacitor Android WebView user-agent (carrying the "; wv)" marker) as "Android App"', () => {
    const ua = 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.0.0 Mobile Safari/537.36';
    expect(deviceLabel(ua)).toBe('Android App');
  });

  it('falls back to "Web session" for an unrecognized user-agent', () => {
    expect(deviceLabel('SomeUnknownClient/1.0')).toBe('Web session');
  });

  it('falls back to "Web session" for a null/undefined user-agent', () => {
    expect(deviceLabel(null)).toBe('Web session');
    expect(deviceLabel(undefined)).toBe('Web session');
  });

  it('a Brave user-agent (which legitimately masks itself as Chrome) is honestly labelled "Chrome on macOS", never guessed as Brave', () => {
    const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
    expect(deviceLabel(ua)).not.toContain('Brave');
    expect(deviceLabel(ua)).toBe('Chrome on macOS');
  });
});
