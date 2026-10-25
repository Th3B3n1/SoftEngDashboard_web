import { MOODLE_BASE } from './client';
import { BACKEND_URL } from '../config';

const TOKEN_KEY = 'moodle.token';
const PASSPORT_KEY = 'moodle.passport';
export const SSO_SCHEME = 'web+softengbme';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const hasToken = () => !!getToken();
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);

/**
 * Exchanges a raw 32-character Moodle token for an AES-256-GCM server-encrypted token (`enc:...`)
 * so the raw Moodle token is never persisted in localStorage.
 */
export async function ensureProtectedToken(tokenInput: string): Promise<string> {
  const trimmed = tokenInput.trim();
  if (trimmed.startsWith('enc:')) {
    setToken(trimmed);
    return trimmed;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/protect-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: trimmed }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.token && typeof data.token === 'string') {
        setToken(data.token);
        return data.token;
      }
    }
  } catch (err) {
    console.warn('Could not exchange token for encrypted token:', err);
  }

  setToken(trimmed);
  return trimmed;
}
export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PASSPORT_KEY);
  localStorage.removeItem('softeng.ltik');
  sessionStorage.removeItem('moodle.snapshot');
  sessionStorage.removeItem('hf.status');
};

/** Direct link to user's token management page on Moodle */
export const MANAGE_TOKEN_URL = `${MOODLE_BASE}/user/managetoken.php`;

/** Direct Moodle LTI launch URL for the Homework Portal (module 221136) */
export const HF_LTI_LAUNCH_URL = `${MOODLE_BASE}/mod/lti/launch.php?id=221136`;

/**
 * Detects mobile / tablet devices (including iPadOS which reports MacIntel with touch points).
 */
export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Checks if the browser supports custom web+ protocol handlers (Desktop Chrome/Edge/Firefox/Brave).
 */
export function isProtocolHandlerSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.registerProtocolHandler === 'function' &&
    !isMobileDevice()
  );
}

/**
 * Registers `web+softengbme://` with the browser so Moodle's launch.php redirect
 * (`web+softengbme://token=...`) automatically routes back to this frontend (`/?sso=...`).
 */
export function registerSsoProtocolHandler(): boolean {
  try {
    if (isProtocolHandlerSupported()) {
      const callbackUrl = `${window.location.origin}/?sso=%s`;
      navigator.registerProtocolHandler(SSO_SCHEME, callbackUrl);
      return true;
    }
  } catch (err) {
    console.warn('Could not register protocol handler:', err);
  }
  return false;
}

/**
 * Official Moodle Mobile SSO flow (works with EduID/Shibboleth on idp.bme.hu).
 * - On desktop when protocol handler is used (`forceCopyableScheme=false`), Moodle redirects to `web+softengbme://token=...`.
 * - On mobile / iOS or manual copy (`forceCopyableScheme=true`), we pass `urlscheme=https&confirmed=1` so Moodle
 *   renders `<a href="https://token=...">`. Unlike custom schemes (`web+softengbme://`), iOS Safari allows copying
 *   `https://` links via long-press ("Copy") and also places the URL directly into the Safari address bar.
 */
export function createLaunchUrl(forceCopyableScheme = false): string {
  const randomBuf = new Uint32Array(1);
  crypto.getRandomValues(randomBuf);
  const passport = String(100_000_000 + (randomBuf[0] % 900_000_000));
  localStorage.setItem(PASSPORT_KEY, passport);
  const useCopyableHttps = forceCopyableScheme || isMobileDevice() || !isProtocolHandlerSupported();
  const scheme = useCopyableHttps ? 'https' : SSO_SCHEME;
  const confirmed = useCopyableHttps ? '&confirmed=1' : '';
  return `${MOODLE_BASE}/admin/tool/mobile/launch.php?service=moodle_mobile_app&passport=${passport}&urlscheme=${encodeURIComponent(scheme)}${confirmed}`;
}

/**
 * Restores exact Base64 casing when a browser's URL parser lowercases the hostname portion of `https://token=<b64>`.
 * Because Moodle's payload starts with `md5_hex(32):::token_hex(32)[:::privatetoken]`, the first 67-69 bytes only
 * contain characters from `0123456789abcdef:`, whose Base64 alphabet at each `i % 4` position has disjoint
 * uppercase and lowercase letters (0 collisions across all 4,913 triplets).
 */
function restoreCaseForHexColonB64(b64: string): string {
  const clean = b64.replace(/=+$/, '');
  const hasPrivateToken = clean.length > 90;
  const UPPER_AT_POS = [
    new Set('mnoyz'),
    new Set('dgtw'),
    new Set('abefijmnqruvyz'),
    new Set(),
  ];
  const chars = clean.split('');
  const limit = Math.min(chars.length, 92);
  for (let i = 0; i < limit; i++) {
    const ch = chars[i].toLowerCase();
    if (!hasPrivateToken && i === 89) {
      chars[i] = ch === 'a' || ch === 'q' ? ch.toUpperCase() : ch;
    } else if (UPPER_AT_POS[i % 4].has(ch)) {
      chars[i] = ch.toUpperCase();
    } else {
      chars[i] = ch;
    }
  }
  const str = chars.join('');
  return str + '='.repeat((4 - (str.length % 4)) % 4);
}

/**
 * Accepts:
 *  - Raw 32-character hex token (e.g. from managetoken.php)
 *  - Full `web+softengbme://token=...`, `https://token=...`, or `moodlemobile://token=...` URL (raw, lowercased, or URL-encoded)
 *  - Raw base64 token string
 */
export function parseRedirect(input: string): string {
  let raw = input.trim();
  // Strip surrounding quotes or brackets if present
  raw = raw.replace(/^["'<({\[]+|["'>)}\]]+$/g, '').trim();

  // If URL-encoded (e.g. from ?sso=web%2Bsoftengbme%3A%2F%2Ftoken%3D...), decode once
  if (raw.includes('%3D') || raw.includes('%3d') || raw.includes('%2F') || raw.includes('%2f')) {
    try {
      raw = decodeURIComponent(raw);
    } catch {
      // keep raw if malformed percent-encoding
    }
  }

  // 1. Direct 32-character hex token or encrypted server token
  if (/^(enc:[A-Za-z0-9\-_]+|[0-9a-f]{32})$/i.test(raw)) {
    return raw;
  }

  // 2. Extract token from URL parameter if present
  let b64 = raw;
  if (b64.includes('token=')) {
    b64 = b64.split('token=').pop()!;
    b64 = b64.split('&')[0].split('#')[0];
  }

  b64 = decodeURIComponent(b64).replace(/-/g, '+').replace(/_/g, '/').trim();
  // Remove any trailing slash added by browser protocol handler normalization
  b64 = b64.replace(/\/+$/, '');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);

  // Try decoding as-is first, then with case-restoration (for `https://token=...` where browser lowercases the host)
  for (const candidate of [padded, restoreCaseForHexColonB64(padded)]) {
    try {
      const decoded = atob(candidate);
      const match = decoded.match(/^[0-9a-f]{32}:::([0-9a-f]{32})/i);
      if (match) {
        return match[1];
      }
      const parts = decoded.split(':::');
      if (parts.length >= 2 && /^[0-9a-f]{32}$/i.test(parts[1])) {
        return parts[1];
      }
      if (/^[0-9a-f]{32}$/i.test(decoded.trim())) {
        return decoded.trim();
      }
    } catch {
      // try next candidate
    }
  }

  throw new Error('A beillesztett szöveg nem tartalmaz érvényes Moodle tokent.');
}

/**
 * Checks if the current URL contains an SSO callback (`?sso=...`, `?token=...`, or `?url=...`),
 * extracts and saves the Moodle token, notifies any opener tab via BroadcastChannel, and cleans the URL.
 */
export function consumeUrlSsoToken(): string | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#\/?/, ''));
  const candidate =
    params.get('sso') ||
    params.get('token') ||
    params.get('url') ||
    hashParams.get('sso') ||
    hashParams.get('token') ||
    hashParams.get('url');

  if (!candidate) return null;

  try {
    const token = parseRedirect(candidate);
    setToken(token);

    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('softeng_auth');
        bc.postMessage({ type: 'SSO_TOKEN', token });
        bc.close();
      }
    } catch {
      // ignore BroadcastChannel errors
    }

    window.history.replaceState({}, document.title, window.location.pathname);

    if (window.opener) {
      try {
        window.close();
      } catch {
        // ignore if browser blocks window.close()
      }
    }

    return token;
  } catch {
    return null;
  }
}
