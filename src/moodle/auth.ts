import { MOODLE_BASE } from './client';

const TOKEN_KEY = 'moodle.token';
const PASSPORT_KEY = 'moodle.passport';
const SCHEME = 'moodlemobile';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const hasToken = () => !!getToken();
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem('moodle.snapshot');
};

/** Direct link to user's token management page on Moodle */
export const MANAGE_TOKEN_URL = `${MOODLE_BASE}/user/managetoken.php`;

/**
 * Official Moodle Mobile SSO flow (works with EduID/Shibboleth).
 * With `confirmed=1`, Moodle renders a page with an explicit link to click/copy
 * instead of issuing an immediate HTTP redirect that mobile browsers fail to display.
 */
export function createLaunchUrl(): string {
  const passport = String(Math.floor(Math.random() * 1e9));
  localStorage.setItem(PASSPORT_KEY, passport);
  return `${MOODLE_BASE}/admin/tool/mobile/launch.php?service=moodle_mobile_app&passport=${passport}&urlscheme=${SCHEME}&confirmed=1`;
}

/**
 * Accepts:
 *  - Raw 32-character hex token (e.g. from managetoken.php)
 *  - Full `moodlemobile://token=...` URL (from long-pressing the launch button)
 *  - Raw base64 token string
 */
export function parseRedirect(input: string): string {
  let raw = input.trim();
  // Strip surrounding quotes or brackets if present
  raw = raw.replace(/^["'<({\[]+|["'>)}\]]+$/g, '').trim();

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

  b64 = decodeURIComponent(b64).replace(/-/g, '+').replace(/_/g, '/');
  b64 += '='.repeat((4 - (b64.length % 4)) % 4);

  let decoded: string;
  try {
    decoded = atob(b64);
  } catch {
    throw new Error('Nem sikerült értelmezni a beillesztett szöveget. Ellenőrizd a kimásolt tokent vagy linket.');
  }

  // Moodle encodes as: md5(site+passport):::token[:::privatetoken]
  const parts = decoded.split(':::');
  if (parts.length >= 2 && /^[0-9a-f]{32}$/i.test(parts[1])) {
    return parts[1];
  }

  // In case the decoded payload is itself a 32-char hex string
  if (/^[0-9a-f]{32}$/i.test(decoded.trim())) {
    return decoded.trim();
  }

  throw new Error('A beillesztett szöveg nem tartalmaz érvényes Moodle tokent.');
}
