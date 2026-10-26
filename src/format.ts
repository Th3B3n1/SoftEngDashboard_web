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

export function fmtTimestamp(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}. ${pad(d.getMonth() + 1)}. ${pad(d.getDate())}. ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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

export function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export function mixHex(hexA: string, hexB: string, ratio: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return (
    '#' +
    a
      .map((c, idx) => c + (b[idx] - c) * ratio)
      .map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0'))
      .join('')
  );
}

export function hexAlpha(hex: string, alpha: number): string {
  return `rgba(${hexToRgb(hex).join(',')},${alpha})`;
}

export function getLevelColor(level: number, totalLevels = 22) {
  const r = totalLevels > 1 ? Math.max(0, Math.min(1, (level - 1) / (totalLevels - 1))) : 0;
  const light = mixHex('#4dabf7', '#e599f7', r);
  const solid = mixHex('#1c7ed6', '#9c36b5', r);
  return {
    gradient: `linear-gradient(135deg, ${light}, ${solid})`,
    barGradient: `linear-gradient(90deg, ${light}, ${solid})`,
    shadow: hexAlpha(solid, 0.35),
    solid,
  };
}

export const GRADE_DOT_COLOR: Record<GradeKey, string> = {
  fail: '#e03131',
  pass: '#868e96',
  satisfactory: '#1c7ed6',
  good: '#0c8599',
  excellent: '#2f9e44',
};

const RARITY_TIERS = ['ubiquitous', 'common', 'uncommon', 'rare', 'epic', 'legendary'] as const;
const RARITY_COLORS: Record<string, { color: string; bg: string }> = RARITY_TIERS.reduce(
  (acc, tier, idx) => {
    const color = mixHex('#1c7ed6', '#f5c518', idx / (RARITY_TIERS.length - 1));
    acc[tier] = { color, bg: mixHex(color, '#ffffff', 0.85) };
    return acc;
  },
  {} as Record<string, { color: string; bg: string }>
);

export const RARITY_INFO: Record<string, { label: string; color: string; bg: string }> = {
  ubiquitous: { label: 'Mindennapos', ...RARITY_COLORS.ubiquitous },
  common: { label: 'Gyakori', ...RARITY_COLORS.common },
  uncommon: { label: 'Szokatlan', ...RARITY_COLORS.uncommon },
  rare: { label: 'Ritka', ...RARITY_COLORS.rare },
  epic: { label: 'Epikus', ...RARITY_COLORS.epic },
  legendary: { label: 'Legendás', ...RARITY_COLORS.legendary },
};

export const RARITY_INFO_EN: Record<string, { label: string; color: string; bg: string }> = {
  ubiquitous: { label: 'Ubiquitous', ...RARITY_COLORS.ubiquitous },
  common: { label: 'Common', ...RARITY_COLORS.common },
  uncommon: { label: 'Uncommon', ...RARITY_COLORS.uncommon },
  rare: { label: 'Rare', ...RARITY_COLORS.rare },
  epic: { label: 'Epic', ...RARITY_COLORS.epic },
  legendary: { label: 'Legendary', ...RARITY_COLORS.legendary },
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

export function getRarityInfo(rarityPct: number | null | undefined, lang: 'hu' | 'en' = 'hu', fallbackKey = 'common') {
  const dict = lang === 'en' ? RARITY_INFO_EN : RARITY_INFO;
  const tier = getRarityTier(rarityPct);
  return dict[tier] || dict[fallbackKey] || RARITY_INFO.common;
}

export function getResultColor(result: LabResult): string {
  switch (result) {
    case 'completed':
      return 'rgb(47, 158, 68)';
    case 'at_risk':
      return 'rgb(224, 49, 49)';
    case 'failed':
      return 'rgb(122, 31, 31)';
    default:
      return 'rgb(134, 142, 150)';
  }
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
