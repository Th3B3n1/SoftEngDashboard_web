const LTIK_KEY = 'softeng.ltik';
const HF_STATUS_KEY = 'hf.status';
export const HF_PORTAL_BASE = 'https://softeng-hw.ftsrg.org';

export interface HfTaskInstance {
  type: string;
  status: string;
  completionDate?: string | null;
  checkCodeCompiles?: boolean;
  checkSonar?: boolean;
  checkBuild?: boolean;
  checkGitConfigSetUp?: boolean;
  checkXmlOk?: boolean;
  checkCommitIsIntegrated?: boolean;
  askedForEvaluationDate?: string | null;
}

export interface HfPhaseInstance {
  type: string;
  status: string;
  completionDate?: string | null;
  taskInstances?: HfTaskInstance[];
}

export interface HfStatus {
  registrationCompletionDate: string | null;
  onboardingCompletionDate: string | null;
  onboardingFirstXmlUploadedDate?: string | null;
  codingCompletionDate: string | null;
  testingCompletionDate: string | null;
  reviewCompletionDate: string | null;
  codingVariant?: string;
  testingVariant?: string;
  phaseInstances?: HfPhaseInstance[];
  status?: string;
  raw?: any;
  fetchedAt: number;
}

export function extractLtik(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    if (!cleaned.includes('ltik=')) {
      return ''; // URL without ltik query parameter is invalid
    }
  }
  if (cleaned.includes('ltik=')) {
    const after = cleaned.split('ltik=')[1];
    cleaned = after.split('&')[0].split('#')[0];
  }
  return cleaned;
}

export function getHfToken(): string | null {
  return localStorage.getItem(LTIK_KEY);
}

export function setHfToken(token: string): void {
  const extracted = extractLtik(token);
  if (extracted) {
    localStorage.setItem(LTIK_KEY, extracted);
  } else {
    localStorage.removeItem(LTIK_KEY);
  }
}

export function clearHfToken(): void {
  localStorage.removeItem(LTIK_KEY);
  localStorage.removeItem(HF_STATUS_KEY);
  sessionStorage.removeItem(HF_STATUS_KEY);
}

export function readCachedHfStatus(): HfStatus | null {
  try {
    const raw = sessionStorage.getItem(HF_STATUS_KEY) || localStorage.getItem(HF_STATUS_KEY);
    return raw ? (JSON.parse(raw) as HfStatus) : null;
  } catch {
    return null;
  }
}

export function writeCachedHfStatus(status: HfStatus | null): void {
  if (status) {
    const str = JSON.stringify(status);
    sessionStorage.setItem(HF_STATUS_KEY, str);
    localStorage.setItem(HF_STATUS_KEY, str);
  } else {
    sessionStorage.removeItem(HF_STATUS_KEY);
    localStorage.removeItem(HF_STATUS_KEY);
  }
}

export function parseHfData(data: any): HfStatus {
  return {
    registrationCompletionDate: data.registrationCompletionDate ?? null,
    onboardingCompletionDate: data.onboardingCompletionDate ?? null,
    onboardingFirstXmlUploadedDate: data.onboardingFirstXmlUploadedDate ?? null,
    codingCompletionDate: data.codingCompletionDate ?? null,
    testingCompletionDate: data.testingCompletionDate ?? null,
    reviewCompletionDate: data.reviewCompletionDate ?? null,
    codingVariant: data.codingVariant,
    testingVariant: data.testingVariant,
    phaseInstances: data.phaseInstances || [],
    status: data.status,
    raw: data,
    fetchedAt: Date.now(),
  };
}

export function parseHfJson(raw: string): HfStatus | null {
  try {
    const data = JSON.parse(raw);
    if (typeof data === 'object' && data !== null && ('phaseInstances' in data || 'registrationCompletionDate' in data || 'status' in data)) {
      return parseHfData(data);
    }
  } catch {
    // not JSON
  }
  return null;
}

async function fetchJsonWithCheck(url: string, headers?: Record<string, string>): Promise<any | null> {
  const res = await fetch(url, headers ? { headers } : undefined);
  if (!res.ok) return null;
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  return await res.json();
}

async function tryFetchFromBase(baseUrl: string, cleanLtik: string, useBearer: boolean): Promise<HfStatus | null> {
  const escapedLtik = encodeURIComponent(cleanLtik);
  const headers = useBearer ? { Authorization: `Bearer ${cleanLtik}` } : undefined;

  const authJson = await fetchJsonWithCheck(`${baseUrl}/api/auth?ltik=${escapedLtik}`, headers);
  const instId = authJson?.courseInstanceIds?.[0];
  if (!instId || typeof instId !== 'string') return null;

  const escapedInstId = encodeURIComponent(instId);
  let instData = await fetchJsonWithCheck(
    `${baseUrl}/api/course-instances/softeng/${escapedInstId}?ltik=${escapedLtik}`,
    headers,
  );
  if (!instData) {
    instData = await fetchJsonWithCheck(
      `${baseUrl}/api/courses/softeng/${escapedInstId}?ltik=${escapedLtik}`,
      headers,
    );
  }
  if (!instData) return null;

  return parseHfData(instData);
}

export async function fetchHfStatus(ltik?: string): Promise<HfStatus | null> {
  const rawInput = ltik ?? getHfToken();
  if (!rawInput) return null;

  const directJson = parseHfJson(rawInput);
  if (directJson) return directJson;

  const token = extractLtik(rawInput);
  if (!token) return null;

  const attempts: Array<() => Promise<HfStatus | null>> = [
    () => tryFetchFromBase('/hf-api', token, true),
    () => tryFetchFromBase(HF_PORTAL_BASE, token, false),
    () => tryFetchFromBase(HF_PORTAL_BASE, token, true),
  ];

  for (const attempt of attempts) {
    try {
      const result = await attempt();
      if (result) return result;
    } catch {
      // try next strategy
    }
  }

  return null;
}
