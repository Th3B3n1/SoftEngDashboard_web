import type { MoodleSnapshot, QuizInfo } from '../moodle/types';
import type { LabsModel, Rules, TaskModel, TaskRule, TaskStatus } from './types';

const endOfDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59).getTime();
};
const startOfDay = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0).getTime();
};

const done = (q: QuizInfo | undefined) => !!q && (q.completionState === 1 || q.completionState === 2);

/** Scope (lab numbers) and required count for "at least N labs excellent" tasks. */
function minLabsSpec(key: string): { scope: number[]; n: number } | null {
  const m = key.match(/^min(\d+)(DevProcess|Uml)?Labs?Excellent$/);
  if (!m) return null;
  const scope = m[2] === 'DevProcess' ? [1, 2, 3, 4] : m[2] === 'Uml' ? [5, 6, 7] : [1, 2, 3, 4, 5, 6, 7];
  return { scope, n: Number(m[1]) };
}

export function evaluateTasks(snap: MoodleSnapshot, rules: Rules, labs: LabsModel, now: number): TaskModel[] {
  // recapQuiz k <-> k-th "Ellenőrző kvíz" (opening order). Lecture quizzes are counted.
  const byOrder = (a: QuizInfo, b: QuizInfo) => a.timeOpen - b.timeOpen || a.cmid - b.cmid;
  const recap = snap.quizzes.filter((q) => /^Ellenőrző kvíz/i.test(q.name)).sort(byOrder);
  const lectureDone = snap.quizzes.filter((q) => /^Előadás kvíz/i.test(q.name) && done(q)).length;

  // Check if Moodle has any data or active presence for Lab N
  const labHasMoodle = (n: number) => {
    const lab = labs.labs[n - 1];
    if (!lab) return false;
    // Attended or graded means lab has definite presence
    if (lab.original.status === 'attended' || (lab.finalGrade !== null && lab.finalGrade !== 'fail')) return true;
    const hasQuiz = snap.quizzes.some((q) => new RegExp(`^LAB${n}:\\s*(beugró|kiugró)`, 'i').test(q.name));
    const hasAssign = snap.assignments.some((a) => new RegExp(`^LAB${n}:\\s*jegyzőkönyv`, 'i').test(a.name));
    const hasGroup = snap.groups.some((g) => new RegExp(`^lab${n}_`, 'i').test(g));
    return hasQuiz || hasAssign || hasGroup;
  };

  // Check if Lab N is currently active (open/approaching within 14 days and has Moodle presence)
  const isLabCurrent = (n: number) => {
    const lab = labs.labs[n - 1];
    if (!lab) return false;
    if (lab.finalGrade === 'excellent') return false; // already done with excellent
    if (lab.result === 'at_risk') return true; // retake is active

    // If Moodle doesn't even have this lab yet, it cannot be current
    if (!labHasMoodle(n)) return false;

    // Check date: become current within 14 days of scheduled date
    const defaultIso = rules.labs.defaultDates?.[String(n)];
    const labDate = lab.original.date ?? (defaultIso ? new Date(defaultIso).getTime() : null);
    if (!labDate) return true;

    const windowStart = labDate - 14 * 86_400_000;
    return now >= windowStart;
  };

  return rules.tasks.map((r: TaskRule): TaskModel => {
    const dues = Array.isArray(r.due) ? r.due : [r.due, r.due];
    const dueAt = endOfDay(dues[1]);
    
    // Configurable start date: from (r as any).availableFrom or r.due[0]
    let dueStartAt = Array.isArray(r.due) ? startOfDay(dues[0]) : 0;
    if ((r as any).availableFrom) {
      dueStartAt = new Date((r as any).availableFrom).getTime();
    }
    
    // For homework tasks, check phase availableFrom in rules.homeAssignment
    if (r.group === 'homeAssignment' && r.sub && rules.homeAssignment?.phases?.[r.sub]) {
      const p = rules.homeAssignment.phases[r.sub];
      if (p?.availableFrom) {
        const pStart = new Date(p.availableFrom).getTime();
        dueStartAt = Math.max(dueStartAt, pStart);
      }
    }

    const overdue = now > dueAt;
    let status: TaskStatus = 'untracked';
    let completedAt: number | undefined;
    let isCurrent = false;

    if (r.source === 'labs') {
      const single = r.key.match(/^lab(\d)Excellent$/);
      const spec = minLabsSpec(r.key);
      if (single) {
        const labNum = Number(single[1]);
        const lab = labs.labs[labNum - 1];
        if (lab.finalGrade === 'excellent') {
          status = 'completed';
        } else if (lab.result === 'at_risk') {
          status = 'upcoming';
          isCurrent = true;
        } else if (lab.result === 'upcoming') {
          status = overdue ? 'missed' : 'upcoming';
          // Only current if lab has presence in Moodle and window is reached
          isCurrent = !overdue && isLabCurrent(labNum);
        } else {
          status = 'missed';
        }
      } else if (spec) {
        const sc = spec.scope.map((n) => labs.labs[n - 1]);
        const excellent = sc.filter((l) => l.finalGrade === 'excellent').length;
        const open = sc.filter((l) => l.finalGrade !== 'excellent' && (l.result === 'upcoming' || l.result === 'at_risk')).length;
        status = excellent >= spec.n ? 'completed' : excellent + open >= spec.n ? 'upcoming' : 'missed';

        if (status === 'upcoming') {
          // Check how many labs in scope have presence in Moodle or are completed
          const readyOrDone = spec.scope.filter((n) => labs.labs[n - 1]?.finalGrade === 'excellent' || labHasMoodle(n)).length;
          const hasActiveLab = spec.scope.some((n) => isLabCurrent(n));
          isCurrent = readyOrDone >= spec.n && hasActiveLab && !overdue;
        }
      }
    } else if (r.source === 'recapQuiz') {
      const idx = Number(r.key.replace('recapQuiz', '')) - 1;
      const q = recap[idx];
      if (done(q) && q.timeCompleted !== null && q.timeCompleted * 1000 <= dueAt) {
        status = 'completed';
        completedAt = q.timeCompleted * 1000;
      } else {
        status = overdue || done(q) ? 'missed' : 'upcoming';
      }

      if (status === 'upcoming') {
        // Must exist in Moodle, must be open in Moodle, and start date reached
        const existsInMoodle = !!q;
        const moodleOpen = q && (!q.timeOpen || q.timeOpen * 1000 <= now);
        const startReached = !dueStartAt || now >= dueStartAt;
        isCurrent = existsInMoodle && moodleOpen && startReached && !overdue;
      }
    } else if (r.source === 'lectureQuiz') {
      const need = Number(r.key.replace('lectureQuiz', ''));
      status = lectureDone >= need ? 'completed' : overdue ? 'missed' : 'upcoming';
      if (status === 'upcoming') {
        const startReached = !dueStartAt || now >= dueStartAt;
        isCurrent = startReached && !overdue;
      }
    } else if (r.source.startsWith('untracked:')) {
      status = overdue ? 'missed' : 'upcoming';
      if (status === 'upcoming') {
        const startReached = !dueStartAt || now >= dueStartAt;
        if (r.group === 'homeAssignment' && r.sub && rules.homeAssignment?.phases?.[r.sub]) {
          const p = rules.homeAssignment.phases[r.sub];
          const pStart = p.availableFrom ? new Date(p.availableFrom).getTime() : 0;
          const pDue = p.lateSubmissionDate ? new Date(p.lateSubmissionDate).getTime() : (p.dueDate ? new Date(p.dueDate).getTime() : dueAt);
          const phaseOpen = (!pStart || now >= pStart) && now <= pDue;
          isCurrent = phaseOpen && startReached && !overdue;
        } else {
          isCurrent = startReached && !overdue;
        }
      }
    }

    return { ...r, status, dueAt, dueStartAt, completedAt, isCurrent };
  });
}
