import type { GradeKey, LabResult } from './engine/types';
import taskTextsHu from './rules/taskTexts.hu.json';
import taskTextsEn from './rules/taskTexts.en.json';

const dateFmtHu = new Intl.DateTimeFormat('hu-HU', { month: 'short', day: 'numeric' });
const dateFmtEn = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

const labDateFmtHu = new Intl.DateTimeFormat('hu-HU', {
  month: 'short',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const labDateFmtEn = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const dateTimeFmtHu = new Intl.DateTimeFormat('hu-HU', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const dateTimeFmtEn = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const toValidDate = (ms: number | string | Date): Date | null => {
  const d = ms instanceof Date ? ms : new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const fmtDate = (ms: number | string | Date, lang: 'hu' | 'en' = 'hu') => {
  const d = toValidDate(ms);
  if (!d) return '–';
  return (lang === 'hu' ? dateFmtHu : dateFmtEn).format(d);
};

export const fmtLabDate = (ms: number | string | Date, lang: 'hu' | 'en' = 'hu') => {
  const d = toValidDate(ms);
  if (!d) return '–';
  return (lang === 'hu' ? labDateFmtHu : labDateFmtEn).format(d);
};

export const fmtDateTime = (ms: number | string | Date, lang: 'hu' | 'en' = 'hu') => {
  const d = toValidDate(ms);
  if (!d) return '–';
  return (lang === 'hu' ? dateTimeFmtHu : dateTimeFmtEn).format(d);
};

export function relDays(target: number | string | Date, now = Date.now(), lang: 'hu' | 'en' = 'hu'): string {
  const targetMs = typeof target === 'number' ? target : new Date(target).getTime();
  const d = Math.ceil((targetMs - now) / 86_400_000);
  if (lang === 'hu') {
    if (d < 0) return `${-d} napja lejárt`;
    if (d === 0) return 'ma';
    if (d === 1) return '1 nap múlva';
    return `${d} nap múlva`;
  } else {
    if (d < 0) return `${-d}d ago`;
    if (d === 0) return 'today';
    if (d === 1) return 'in 1 day';
    return `in ${d} days`;
  }
}

export const GRADE_LABEL: Record<GradeKey, string> = {
  fail: 'Elégtelen',
  pass: 'Elégséges',
  satisfactory: 'Közepes',
  good: 'Jó',
  excellent: 'Jeles',
};

export const GRADE_LABEL_EN: Record<GradeKey, string> = {
  fail: 'Fail (1)',
  pass: 'Pass (2)',
  satisfactory: 'Satisfactory (3)',
  good: 'Good (4)',
  excellent: 'Excellent (5)',
};

export const GRADE_DOT_COLOR: Record<GradeKey, string> = {
  fail: 'rgb(224, 49, 49)',
  pass: 'rgb(253, 126, 20)',
  satisfactory: 'rgb(252, 196, 25)',
  good: 'rgb(32, 201, 151)',
  excellent: 'rgb(81, 207, 102)',
};

export const RARITY_INFO: Record<string, { label: string; color: string; bg: string }> = {
  ubiquitous: { label: 'Mindennapos', color: 'rgb(134, 142, 150)', bg: 'rgba(134, 142, 150, 0.15)' },
  common: { label: 'Gyakori', color: 'rgb(28, 126, 214)', bg: 'rgba(28, 126, 214, 0.15)' },
  uncommon: { label: 'Szokatlan', color: 'rgb(32, 201, 151)', bg: 'rgba(32, 201, 151, 0.15)' },
  rare: { label: 'Ritka', color: 'rgb(158, 169, 100)', bg: 'rgba(158, 169, 100, 0.25)' },
  epic: { label: 'Epikus', color: 'rgb(174, 62, 201)', bg: 'rgba(174, 62, 201, 0.15)' },
  legendary: { label: 'Legendás', color: 'rgb(245, 159, 0)', bg: 'rgba(245, 159, 0, 0.15)' },
};

export const RARITY_INFO_EN: Record<string, { label: string; color: string; bg: string }> = {
  ubiquitous: { label: 'Everyday', color: 'rgb(134, 142, 150)', bg: 'rgba(134, 142, 150, 0.15)' },
  common: { label: 'Common', color: 'rgb(28, 126, 214)', bg: 'rgba(28, 126, 214, 0.15)' },
  uncommon: { label: 'Uncommon', color: 'rgb(32, 201, 151)', bg: 'rgba(32, 201, 151, 0.15)' },
  rare: { label: 'Rare', color: 'rgb(158, 169, 100)', bg: 'rgba(158, 169, 100, 0.25)' },
  epic: { label: 'Epic', color: 'rgb(174, 62, 201)', bg: 'rgba(174, 62, 201, 0.15)' },
  legendary: { label: 'Legendary', color: 'rgb(245, 159, 0)', bg: 'rgba(245, 159, 0, 0.15)' },
};

export function getRarityTier(rarityPct: number | null | undefined): string {
  if (rarityPct == null || rarityPct <= 0) return 'common';
  if (rarityPct <= 1) return 'legendary';
  if (rarityPct <= 10) return 'epic';
  if (rarityPct <= 25) return 'rare';
  if (rarityPct <= 35) return 'uncommon';
  if (rarityPct <= 50) return 'common';
  return 'ubiquitous';
}

export const LAB_RESULT: Record<LabResult, { label: string; color: string }> = {
  completed: { label: 'Teljesítve', color: 'rgb(47, 158, 68)' },
  upcoming: { label: 'Közelgő', color: 'rgb(134, 142, 150)' },
  at_risk: { label: 'Veszélyben', color: 'rgb(224, 49, 49)' },
  failed: { label: 'Elbukva', color: 'rgb(122, 31, 31)' },
};

export const LAB_RESULT_EN: Record<LabResult, { label: string; color: string }> = {
  completed: { label: 'Completed', color: 'rgb(47, 158, 68)' },
  upcoming: { label: 'Upcoming', color: 'rgb(134, 142, 150)' },
  at_risk: { label: 'At risk', color: 'rgb(224, 49, 49)' },
  failed: { label: 'Failed', color: 'rgb(122, 31, 31)' },
};

export const GROUP_LABEL: Record<string, string> = {
  labs: 'Laborok',
  homeAssignment: 'Házi feladat',
  recapQuizzes: 'Összefoglaló kvízek',
  extraAssignments: 'Extra feladatok',
  misc: 'Egyéb',
};

export const GROUP_LABEL_EN: Record<string, string> = {
  labs: 'Labs',
  homeAssignment: 'Homework',
  recapQuizzes: 'Recap quizzes',
  extraAssignments: 'Extra assignments',
  misc: 'Other',
};

const mapHu = taskTextsHu as unknown as Record<string, { title: string; description: string; group?: string }>;
const mapEn = taskTextsEn as unknown as Record<string, { title: string; description: string; group?: string }>;

export function getTaskInfo(key: string, fallbackGroup = '', lang: 'hu' | 'en' = 'hu') {
  const dict = lang === 'en' ? mapEn : mapHu;
  if (dict[key]) {
    return dict[key];
  }
  // Humanize key as fallback
  const title = key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
  const groupLabel = (lang === 'en' ? GROUP_LABEL_EN : GROUP_LABEL)[fallbackGroup] || fallbackGroup;
  return {
    title,
    description: '',
    group: groupLabel,
  };
}
