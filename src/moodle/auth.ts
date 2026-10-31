import { MOODLE_BASE } from './client';

const TOKEN_KEY = 'moodle.token';
const PASSPORT_KEY = 'moodle.passport';

export const getToken = (): string | null => {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  // Clear legacy backend-encrypted tokens that cannot be used directly with Moodle
  if (raw.startsWith('enc:')) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  return raw;
};

export const hasToken = () => !!getToken();
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t.trim());

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PASSPORT_KEY);
  localStorage.removeItem('softeng.ltik');
  localStorage.removeItem('hf.status');
  sessionStorage.removeItem('moodle.snapshot');
  sessionStorage.removeItem('hf.status');
};

/** Direct link to user's token management page on Moodle */
export const MANAGE_TOKEN_URL = `${MOODLE_BASE}/user/managetoken.php`;

/** Direct Moodle LTI launch URL for the Homework Portal (module 221136) */
export const HF_LTI_LAUNCH_URL = `${MOODLE_BASE}/mod/lti/launch.php?id=221136`;

/**
 * Generates the Moodle Mobile launch URL with `urlscheme=https&confirmed=1`
 * so the user can copy the resulting `https://token=...` link after EduID login.
 */
export function createLaunchUrl(): string {
  const randomBuf = new Uint32Array(1);
  crypto.getRandomValues(randomBuf);
  const passport = String(100_000_000 + (randomBuf[0] % 900_000_000));
  localStorage.setItem(PASSPORT_KEY, passport);
  return `${MOODLE_BASE}/admin/tool/mobile/launch.php?service=moodle_mobile_app&passport=${passport}&urlscheme=https&confirmed=1`;
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
 *  - Full `https://token=...`, `moodlemobile://token=...`, or `web+softengbme://token=...` URL (raw, lowercased, or URL-encoded)
 *  - Raw base64 token string
 */
export function parseRedirect(input: string): string {
  let raw = input.trim();
  // Strip surrounding quotes or brackets if present
  raw = raw.replace(/^["'<({\[]+|["'>)}\]]+$/g, '').trim();

  if (raw.includes('%3D') || raw.includes('%3d') || raw.includes('%2F') || raw.includes('%2f')) {
    try {
      raw = decodeURIComponent(raw);
    } catch {
      // keep raw if malformed percent-encoding
    }
  }

  // 1. Direct 32-character hex token
  if (/^[0-9a-f]{32}$/i.test(raw)) {
    return raw;
  }

  // 2. Extract token from URL parameter if present
  let b64 = raw;
  if (b64.includes('token=')) {
    b64 = b64.split('token=').pop()!;
    b64 = b64.split('&')[0].split('#')[0];
  }

  b64 = decodeURIComponent(b64).replace(/-/g, '+').replace(/_/g, '/').trim();
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
