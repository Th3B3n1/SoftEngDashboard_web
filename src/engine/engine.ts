import type { MoodleSnapshot } from '../moodle/types';
import rulesJson from '../rules/rules.json';
import { fmtTimestamp } from '../format';
import { computeLabs } from './labs';
import { computeStatsFromTasks } from './levels';
import { evaluateTasks } from './tasks';
import type { DashboardModel, HomeAssignmentModel, HomeAssignmentPhase, Rules } from './types';

export const rules = rulesJson as unknown as Rules;

export function computeDashboard(snap: MoodleSnapshot, now = Date.now(), r: Rules = rules): DashboardModel {
  const labs = computeLabs(snap, r, now);
  const tasks = evaluateTasks(snap, r, labs, now);
  const { xp, level, points } = computeStatsFromTasks(tasks, r.levels);

  const dash = snap.assignments.find((a) => /\(Dashboard\)/i.test(a.name) && /Félévközi/i.test(a.name));
  const updated = dash?.feedbackText?.match(/Last updated:\s*(\S+)/)?.[1] ?? null;
  const moodleLastUpdated = fmtTimestamp(snap.fetchedAt || now);

  const rawPhases = r.homeAssignment?.phases ?? {};
  const phases: Record<string, HomeAssignmentPhase> = {};
  for (const [key, p] of Object.entries(rawPhases)) {
    phases[key] = {
      key,
      name: p.name ?? key,
      result: 'upcoming',
      lateSubmissionFeeCharged: false,
      availableFrom: p.availableFrom ?? undefined,
      dueDate: p.dueDate ?? '',
      lateSubmissionDate: p.lateSubmissionDate ?? undefined,
      completedOn: null,
    };
  }

  const homeAssignment: HomeAssignmentModel = {
    windowStartDate: r.homeAssignment?.windowStartDate || '',
    windowEndDate: r.homeAssignment?.windowEndDate || '',
    phases,
  };

  return {
    user: snap.user,
    fetchedAt: snap.fetchedAt,
    moodleLastUpdated,
    lastUpdatedOn: moodleLastUpdated,
    labs,
    homeAssignment,
    tasks,
    xp,
    level,
    levels: r.levels,
    gradeInfo: r.gradeInfo,
    points,
    official: dash ? { gradeText: dash.gradeText, updatedAt: updated } : null,
  };
}
