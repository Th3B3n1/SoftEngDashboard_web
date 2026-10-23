import type { MoodleSnapshot } from '../moodle/types';
import rulesJson from '../rules/rules.json';
import { computeLabs } from './labs';
import { examPointsAt, imscPointsAt, levelProgress } from './levels';
import { evaluateTasks } from './tasks';
import type { DashboardModel, HomeAssignmentModel, HomeAssignmentPhase, Rules } from './types';

export const rules = rulesJson as unknown as Rules;

export function computeDashboard(snap: MoodleSnapshot, now = Date.now(), r: Rules = rules): DashboardModel {
  const labs = computeLabs(snap, r, now);
  const tasks = evaluateTasks(snap, r, labs, now);

  const sum = (f: (t: (typeof tasks)[number]) => boolean) => tasks.filter(f).reduce((s, t) => s + t.xp, 0);
  const tracked = sum((t) => t.status === 'completed');
  const mandatory = sum((t) => t.status === 'completed' && t.type === 'mandatory');
  // Optimistic ceiling: everything not already missed, incl. tasks we cannot observe.
  const maxReachable = sum((t) => t.status !== 'missed');

  const level = levelProgress(r.levels, tracked);
  const exam = examPointsAt(r.levels, level.level);
  // Mandatory-task points carry over to the next semester; the rest is this-semester "bonus".
  const carried = examPointsAt(r.levels, levelProgress(r.levels, mandatory).level);

  const dash = snap.assignments.find((a) => /\(Dashboard\)/i.test(a.name) && /Félévközi/i.test(a.name));
  const updated = dash?.feedbackText?.match(/Last updated:\s*(\S+)/)?.[1] ?? null;

  const moodleDateObj = new Date(snap.fetchedAt || now);
  const moodleLastUpdated = `${moodleDateObj.getFullYear()}. ${String(moodleDateObj.getMonth() + 1).padStart(2, '0')}. ${String(moodleDateObj.getDate()).padStart(2, '0')}. ${String(moodleDateObj.getHours()).padStart(2, '0')}:${String(moodleDateObj.getMinutes()).padStart(2, '0')}`;

  const rawPhases = r.homeAssignment?.phases ?? {};
  const phases: Record<string, HomeAssignmentPhase> = {};
  for (const [key, p] of Object.entries(rawPhases) as [string, any][]) {
    phases[key] = {
      key,
      name: p.name ?? key,
      result: 'upcoming',
      lateSubmissionFeeCharged: false,
      availableFrom: p.availableFrom ?? null,
      dueDate: p.dueDate ?? null,
      lateSubmissionDate: p.lateSubmissionDate ?? null,
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
    xp: { tracked, mandatory, maxReachable },
    level,
    levels: r.levels,
    gradeInfo: r.gradeInfo,
    points: { exam, imsc: imscPointsAt(r.levels, level.level), midterm: carried, bonus: exam - carried, carried },
    official: dash ? { gradeText: dash.gradeText, updatedAt: updated } : null,
  };
}

