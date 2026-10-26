import { GRADE_KEYS, type EvaluatedUnlockCondition, type GradeKey, type Level, type Rules, type TaskModel } from './types';

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
    rarityPct: levels[level - 1]?.rarityPct,
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

/** Resolves unlock conditions on tasks and computes XP totals, level progress, maxReachableLevel, and points. */
export function computeStatsFromTasks(tasks: TaskModel[], levels: Level[]) {
  let tracked = 0;
  let mandatory = 0;

  for (const t of tasks) {
    if (t.status === 'completed') {
      tracked += t.xp;
      if (t.type === 'mandatory') {
        mandatory += t.xp;
      }
    }
  }

  const currentLevelProgress = levelProgress(levels, tracked);
  const currentLevel = currentLevelProgress.level;

  const taskByKey = new Map<string, TaskModel>();
  for (const t of tasks) {
    taskByKey.set(t.key, t);
  }

  const getBaseStatus = (t: TaskModel) => (t.status === 'completed' ? 'completed' : (t.baseStatus ?? t.status));
  const getBaseIsCurrent = (t: TaskModel) => (t.status === 'completed' ? false : (t.baseIsCurrent ?? Boolean(t.isCurrent)));

  const tasksWithConditions = tasks.filter((t) => t.unlockConditions && t.unlockConditions.length > 0);
  let unreachableKeys = new Set<string>();

  for (let iter = 0; iter <= tasksWithConditions.length; iter++) {
    const tentativeMaxXp = tasks
      .filter((t) => getBaseStatus(t) !== 'missed' && !unreachableKeys.has(t.key))
      .reduce((sum, t) => sum + t.xp, 0);
    const tentativeMaxLevel = levelForXp(levels, tentativeMaxXp);

    const nextUnreachable = new Set(unreachableKeys);
    for (const t of tasksWithConditions) {
      const baseSt = getBaseStatus(t);
      if (baseSt === 'completed' || baseSt === 'missed' || nextUnreachable.has(t.key)) continue;

      const isBlockedByMissedCond = (t.unlockConditions ?? []).some((cond) => {
        if (cond.type === 'level_reached') {
          return currentLevel < cond.level && tentativeMaxLevel < cond.level;
        }
        const prereq = taskByKey.get(cond.taskKey);
        if (!prereq) return false;
        const prereqStatus = getBaseStatus(prereq);
        return prereqStatus === 'missed' || nextUnreachable.has(cond.taskKey);
      });

      if (isBlockedByMissedCond) {
        nextUnreachable.add(t.key);
      }
    }

    if (nextUnreachable.size === unreachableKeys.size) break;
    unreachableKeys = nextUnreachable;
  }

  const maxReachable = tasks
    .filter((t) => getBaseStatus(t) !== 'missed' && !unreachableKeys.has(t.key))
    .reduce((sum, t) => sum + t.xp, 0);
  const maxReachableLevel = levelForXp(levels, maxReachable);

  const resolvedTasks: TaskModel[] = tasks.map((t) => {
    if (!t.unlockConditions || t.unlockConditions.length === 0) {
      return t;
    }

    const baseStatus = getBaseStatus(t);
    const baseIsCurrent = getBaseIsCurrent(t);

    const evaluatedConditions: EvaluatedUnlockCondition[] = t.unlockConditions.map((cond) => {
      if (cond.type === 'level_reached') {
        const met = currentLevel >= cond.level;
        const status = met ? 'completed' : maxReachableLevel < cond.level ? 'missed' : 'upcoming';
        return { condition: cond, met, status };
      }
      const prereq = taskByKey.get(cond.taskKey);
      const prereqBaseStatus = prereq ? getBaseStatus(prereq) : 'upcoming';
      const prereqIsMissed = prereqBaseStatus === 'missed' || unreachableKeys.has(cond.taskKey);
      const met = prereqBaseStatus === 'completed';
      const status = met
        ? 'completed'
        : prereqIsMissed
        ? 'missed'
        : prereq && getBaseIsCurrent(prereq)
        ? 'current'
        : 'upcoming';
      return { condition: cond, met, status };
    });

    const allMet = evaluatedConditions.every((c) => c.met);
    const anyMissed = evaluatedConditions.some((c) => c.status === 'missed');
    const lockStatus: 'unlocked' | 'locked' = allMet ? 'unlocked' : 'locked';

    let status = baseStatus;
    let isCurrent = baseIsCurrent;

    if (baseStatus === 'completed') {
      status = 'completed';
      isCurrent = false;
    } else if (anyMissed || baseStatus === 'missed') {
      status = 'missed';
      isCurrent = false;
    } else if (lockStatus === 'locked') {
      status = 'upcoming';
      isCurrent = false;
    }

    return {
      ...t,
      baseStatus,
      baseIsCurrent,
      status,
      isCurrent,
      lockStatus,
      evaluatedConditions,
    };
  });

  const level = {
    ...currentLevelProgress,
    maxReachableLevel,
  };
  const exam = examPointsAt(levels, level.level);
  const carried = examPointsAt(levels, levelProgress(levels, mandatory).level);
  const imsc = imscPointsAt(levels, level.level);

  return {
    tasks: resolvedTasks,
    xp: { tracked, mandatory, maxReachable },
    level,
    points: { exam, imsc, midterm: carried, bonus: exam - carried, carried },
  };
}

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
  const neededByGrade = GRADE_KEYS.map((_, n) => (n === 0 ? null : examPointsNeeded(rules, level, n)));
  return GRADE_KEYS.map((key, n) => {
    if (n === 0) {
      return {
        key,
        neededPoints: rules.gradeInfo.examPassThreshold,
        neededPct: Math.round((rules.gradeInfo.examPassThreshold / total) * 100),
        reachable: true,
      };
    }
    const needed = neededByGrade[n]!;
    const supersededByHigherGrade = GRADE_KEYS.some((_, idx) => idx > n && neededByGrade[idx] === needed);
    return {
      key,
      neededPoints: needed,
      neededPct: Math.round((needed / total) * 100),
      reachable: !supersededByHigherGrade && needed <= total,
    };
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
    const len = levels[r - 1]?.rewards?.length ?? levels[r - 1]?.levelRewards?.length ?? 0;
    if (len > 0) return r;
  }
  return Math.min(level + 1, levels.length);
}
