import { BACKEND_URL } from '../config';

const LTIK_KEY = 'softeng.ltik';

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
    if (typeof data === 'object' && data !== null) {
      return parseHfData(data);
    }
  } catch {
    // not JSON
  }
  return null;
}

export async function fetchHfStatus(ltik?: string): Promise<HfStatus | null> {
  const token = ltik ? extractLtik(ltik) : getHfToken();
  if (!token) return null;

  try {
    // Route through backend which handles Cloudflare & CORS
    const proxyUrl = `${BACKEND_URL}/api/hf/status?ltik=${encodeURIComponent(token)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) {
      console.warn(`HF proxy returned status ${res.status}`);
      return null;
    }
    const data = await res.json();
    return parseHfData(data);
  } catch (err) {
    console.warn('Failed to fetch HF status via proxy:', err);
    return null;
  }
}
