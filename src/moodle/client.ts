import { BACKEND_URL } from '../config';

export const MOODLE_BASE = 'https://edu.vik.bme.hu';

export class MoodleError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
  get isAuth() {
    return this.code === 'invalidtoken' || this.code === 'accessexception';
  }
}

type Param = string | number | boolean | Param[] | { [k: string]: Param };

/** Moodle's PHP-style nested params: a[0]=x, b[0][c]=y */
function flatten(params: Record<string, Param>, out = new URLSearchParams(), prefix = ''): URLSearchParams {
  for (const [k, v] of Object.entries(params)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => flatten({ [i]: x }, out, key));
    else if (v !== null && typeof v === 'object') flatten(v as Record<string, Param>, out, key);
    else out.append(key, String(v));
  }
  return out;
}

/**
 * Call a Moodle web-service function via the backend read-only Course 16995 proxy.
 * Sent as application/x-www-form-urlencoded => a CORS "simple request" (no preflight).
 */
export async function callWs<T>(token: string, fn: string, params: Record<string, Param> = {}): Promise<T> {
  const body = flatten({ wstoken: token, wsfunction: fn, moodlewsrestformat: 'json', ...params });
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/api/moodle/ws`, { method: 'POST', body });
  } catch {
    throw new MoodleError('A szerver / Moodle nem érhető el (hálózati hiba).', 'network');
  }
  const json = await res.json().catch(() => null);
  if (json && typeof json === 'object' && 'exception' in json) {
    throw new MoodleError(String(json.message ?? json.exception), String(json.errorcode ?? ''));
  }
  if (!res.ok) throw new MoodleError(`Moodle HTTP ${res.status}`, 'http');
  return json as T;
}

interface BatchResponse {
  responses: { error: boolean; data?: string; exception?: { message?: string } }[];
}

export interface BatchCall {
  fn: string;
  args: Record<string, Param>;
}

/**
 * Run many calls in few HTTP requests via tool_mobile_call_external_functions.
 * Failed individual calls resolve to `null` (e.g. no permission) instead of failing the batch.
 */
export async function callBatch(token: string, calls: BatchCall[], chunk = 25): Promise<(unknown | null)[]> {
  const results: (unknown | null)[] = [];
  for (let i = 0; i < calls.length; i += chunk) {
    const slice = calls.slice(i, i + chunk);
    const requests = slice.map((c) => ({ function: c.fn, arguments: JSON.stringify(c.args) }));
    const res = await callWs<BatchResponse>(token, 'tool_mobile_call_external_functions', { requests });
    for (const r of res.responses) {
      results.push(r.error || r.data === undefined ? null : JSON.parse(r.data));
    }
  }
  return results;
}

