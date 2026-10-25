import { describe, expect, it } from 'vitest';
import { parseRedirect } from './auth';

describe('parseRedirect token extractor', () => {
  const token = 'c0326cf39e948f93a123456789abcdef';

  it('accepts raw 32-character hex tokens', () => {
    expect(parseRedirect(token)).toBe(token);
    expect(parseRedirect(`  ${token}  `)).toBe(token);
    expect(parseRedirect(`"${token}"`)).toBe(token);
    expect(parseRedirect(token.toUpperCase())).toBe(token.toUpperCase());
  });

  it('accepts moodlemobile://token= URLs', () => {
    // passport md5 + ':::' + token
    const passportHash = '1234567890abcdef1234567890abcdef';
    const payload = `${passportHash}:::${token}`;
    const b64 = Buffer.from(payload).toString('base64');

    expect(parseRedirect(`moodlemobile://token=${b64}`)).toBe(token);
    expect(parseRedirect(`moodlemobile://token=${b64}&redirect=none`)).toBe(token);
    expect(parseRedirect(`web+softengbme://token=${b64}`)).toBe(token);
    expect(parseRedirect(`web+softengbme://token=${b64}/`)).toBe(token);
    expect(parseRedirect(encodeURIComponent(`web+softengbme://token=${b64}`))).toBe(token);
    expect(parseRedirect(b64)).toBe(token);
  });

  it('handles tokens with private token appended', () => {
    const passportHash = '1234567890abcdef1234567890abcdef';
    const privateToken = 'fedcba9876543210fedcba9876543210';
    const payload = `${passportHash}:::${token}:::${privateToken}`;
    const b64 = Buffer.from(payload).toString('base64');

    expect(parseRedirect(`moodlemobile://token=${b64}`)).toBe(token);
  });

  it('accepts https://token= URLs even when lowercased by mobile browser URL normalization', () => {
    const passportHash = '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d';
    const privateToken = 'AbCdEf0123456789+/=AbCdEf0123456789';

    // With private token
    const b64WithPriv = Buffer.from(`${passportHash}:::${token}:::${privateToken}`).toString('base64');
    const normalizedWithPriv = new URL(`https://token=${b64WithPriv}`).href;
    expect(parseRedirect(normalizedWithPriv)).toBe(token);
    expect(parseRedirect(`https://token=${b64WithPriv.toLowerCase()}`)).toBe(token);

    // Without private token
    const b64WithoutPriv = Buffer.from(`${passportHash}:::${token}`).toString('base64');
    const normalizedWithoutPriv = new URL(`https://token=${b64WithoutPriv}`).href;
    expect(parseRedirect(normalizedWithoutPriv)).toBe(token);
    expect(parseRedirect(`https://token=${b64WithoutPriv.toLowerCase()}`)).toBe(token);
  });

  it('rejects invalid inputs', () => {
    expect(() => parseRedirect('short')).toThrow();
    expect(() => parseRedirect('moodlemobile://token=notbase64!!!')).toThrow();
  });
});

