import { GRADE_KEYS, type GradeKey, type Level, type Rules } from './types';

/** Total XP needed to *reach* level L (level 1 = 0). */
export const cumXp = (levels: Level[], L: number) =>
  levels.slice(0, Math.max(0, L - 1)).reduce((s, l) => s + l.xpToLevelUp, 0);

export function levelForXp(levels: Level[], xp: number): number {
  let r = 1;
  while (r < levels.length && cumXp(levels, r + 1) <= xp) r++;
  return r;
}

export function levelProgress(levels: Level[], xp: number) {
  const level = levelForXp(levels, xp);
  const currentXp = Math.max(0, xp - cumXp(levels, level));
  const isMax = level >= levels.length;
  const needed = isMax ? 0 : (levels[level - 1]?.xpToLevelUp ?? 0);
  return {
    level,
    currentXp,
    needed,
    remaining: Math.max(needed - currentXp, 0),
    percent: isMax ? 100 : Math.min(100, Math.round((currentXp / needed) * 100)),
  };
}

const rewardSum = (levels: Level[], level: number, type: 'exam_point' | 'imsc_point') =>
  levels
    .slice(0, Math.max(0, level))
    .flatMap((l) => l.rewards || l.levelRewards || [])
    .filter((r) => r.type === type)
    .reduce((s, r) => s + (r.amount ?? 0), 0);

export const examPointsAt = (levels: Level[], level: number, extra = 0) => rewardSum(levels, level, 'exam_point') + extra;
export const imscPointsAt = (levels: Level[], level: number) => rewardSum(levels, level, 'imsc_point');

/** Grade reached with the points of `level` and *no* exam points yet is meaningless; this is the pre-exam standing. */
export function gradeFor(rules: Rules, level: number): GradeKey {
  const pts = examPointsAt(rules.levels, level);
  if (pts < rules.gradeInfo.examPassThreshold) return 'fail';
  for (let i = GRADE_KEYS.length - 1; i >= 0; i--) if (pts >= rules.gradeInfo.gradeThresholds[i]) return GRADE_KEYS[i];
  return 'fail';
}

/** Exam points needed for grade index `n` (1..4) when starting with the points of `level`. */
export function examPointsNeeded(rules: Rules, level: number, n: number): number {
  const pts = examPointsAt(rules.levels, level);
  return Math.max(rules.gradeInfo.gradeThresholds[n] - pts, rules.gradeInfo.examPassThreshold);
}

export interface ForecastRow {
  key: GradeKey;
  neededPoints: number | null;
  neededPct: number | null;
  /** false when even a perfect exam isn't enough */
  reachable: boolean;
}

export function forecast(rules: Rules, level: number): ForecastRow[] {
  const total = rules.gradeInfo.pointsCollectableOnTheExam;
  return GRADE_KEYS.map((key, n) => {
    if (n === 0) {
      return { key, neededPoints: rules.gradeInfo.examPassThreshold, neededPct: Math.round((rules.gradeInfo.examPassThreshold / total) * 100), reachable: true };
    }
    const needed = examPointsNeeded(rules, level, n);
    return { key, neededPoints: needed, neededPct: Math.round((needed / total) * 100), reachable: needed <= total };
  });
}

/** Level whose reward sets a proposed grade (grade 5 = jeles), if reached. */
export function proposedGrade(levels: Level[], level: number): number | null {
  for (let r = Math.min(level, levels.length); r >= 1; r--) {
    const list = levels[r - 1]?.rewards || levels[r - 1]?.levelRewards || [];
    const g = list.find((x) => x.type === 'proposed_grade');
    if (g?.grade) return g.grade;
  }
  return null;
}

/** Next level that actually carries a reward (the dashboard's "next milestone"). */
export function nextRewardLevel(levels: Level[], level: number): number {
  for (let r = level + 1; r <= levels.length; r++) {
    const len = (levels[r - 1]?.rewards?.length ?? levels[r - 1]?.levelRewards?.length ?? 0);
    if (len > 0) return r;
  }
  return Math.min(level + 1, levels.length);
}

