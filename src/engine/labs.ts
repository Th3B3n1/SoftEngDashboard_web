import type { AssignInfo, MoodleSnapshot, QuizInfo } from '../moodle/types';
import type { LabAttempt, LabGrade, LabModel, LabsModel, ReportState, Rules } from './types';

const HOUR = 3600_000;
/** Moodle quizzes open at e.g. 14:15 for a 14:00 lab; the lab itself starts on the hour. */
const labStart = (q: QuizInfo | undefined) => (q && q.timeOpen ? Math.floor((q.timeOpen * 1000) / HOUR) * HOUR : null);

function reportState(a: AssignInfo | undefined): ReportState {
  if (!a || !a.submissionStatus || a.submissionStatus === 'new') return 'none';
  if (a.gradingStatus === 'graded') return /kiválóan/i.test(a.gradeText ?? '') ? 'excellent' : 'graded';
  return 'submitted';
}

interface Trio {
  entry?: QuizInfo;
  exit?: QuizInfo;
  report?: AssignInfo;
}

function buildAttempt(
  kind: 'original' | 'retake',
  t: Trio,
  room: string | null,
  rules: Rules,
  now: number,
  defaultDateIso?: string,
  laterLabExists = false,
): LabAttempt {
  const parsedDefault = defaultDateIso ? new Date(defaultDateIso).getTime() : null;
  const date = labStart(t.entry) ?? parsedDefault;
  const hasMoodleActivities = Boolean(t.entry || t.exit || t.report);

  // If a lab has no beugró, kiugró, or jegyzőkönyv for this student (e.g. due to a public holiday)
  // and either its scheduled date has passed or a subsequent lab is already active in Moodle,
  // the student automatically receives a "Megfelelt" ('pass') grade without needing a retake.
  if (kind === 'original' && !hasMoodleActivities && (laterLabExists || (date !== null && now >= date))) {
    return {
      kind,
      date,
      room,
      status: 'attended',
      entryPassed: null,
      exitMet: null,
      report: 'none',
      grade: 'pass',
    };
  }

  const entryAttempted = (t.entry?.attempts ?? 0) > 0;
  const status: LabAttempt['status'] =
    date === null || now < date ? 'upcoming' : entryAttempted || (t.exit?.attempts ?? 0) > 0 ? 'attended' : 'absent';

  const base: LabAttempt = {
    kind, date, room, status, entryPassed: null, exitMet: null,
    report: reportState(t.report), grade: null,
  };
  if (status === 'upcoming') return base;

  const entryPassed = entryAttempted && (t.entry!.bestGrade ?? 0) >= rules.labs.entryPassGrade;
  const exitMet = (t.exit?.bestGrade ?? 0) >= rules.labs.exitPassGrade;
  let grade: LabGrade = 'fail';
  if (status === 'attended' && entryPassed && exitMet) grade = base.report === 'excellent' ? 'excellent' : 'pass';
  return { ...base, entryPassed, exitMet, grade };
}

const RANK: Record<LabGrade, number> = { fail: 0, pass: 1, excellent: 2 };
const better = (a: LabGrade | null, b: LabGrade | null): LabGrade | null =>
  a === null ? b : b === null ? a : RANK[b] > RANK[a] ? b : a;

export function computeLabs(snap: MoodleSnapshot, rules: Rules, now: number): LabsModel {
  const labQuiz = (n: number, kind: string) =>
    snap.quizzes.find((q) => new RegExp(`^LAB${n}:\\s*${kind}`, 'i').test(q.name));
  const labReport = (n: number) => snap.assignments.find((a) => new RegExp(`^LAB${n}:\\s*jegyzőkönyv`, 'i').test(a.name));
  const labRoom = (n: number) => {
    for (const g of snap.groups) {
      const m = g.match(new RegExp(`^lab${n}_.*_([A-Za-z0-9]+)$`, 'i'));
      if (m) return m[1];
    }
    return null;
  };

  // ---- retake bundles ("Pótlabor <label>: beugró|kiugró|jegyzőkönyv") ----
  const labels = new Set<string>();
  for (const q of snap.quizzes) {
    const m = q.name.match(/^Pótlabor (.+?):\s*(beugró|kiugró)/i);
    if (m) labels.add(m[1]);
  }
  const bundles = [...labels]
    .map((label) => {
      const find = (k: string) => snap.quizzes.find((q) => q.name.startsWith(`Pótlabor ${label}:`) && new RegExp(`:\\s*${k}`, 'i').test(q.name));
      const trio: Trio = {
        entry: find('beugró'),
        exit: find('kiugró'),
        report: snap.assignments.find((a) => a.name.startsWith(`Pótlabor ${label}:`) && /jegyzőkönyv/i.test(a.name)),
      };
      const token = label.split(/[.\s]/)[0]; // "03/04. hét" -> "03/04"
      const grp = snap.groups.find((g) => g.startsWith(`pot_alkalom${token}`));
      const room = grp ? (grp.split('_').pop() ?? null) : null;
      const attempt = buildAttempt('retake', trio, room, rules, now);
      const booked = !!grp || (trio.entry?.attempts ?? 0) > 0 || (trio.exit?.attempts ?? 0) > 0;
      return { attempt: { ...attempt, usesToken: booked }, booked };
    })
    .sort((a, b) => (a.attempt.date ?? 0) - (b.attempt.date ?? 0));

  // ---- originals ----
  const labTrios: Trio[] = Array.from({ length: rules.labs.count }, (_, i) => {
    const n = i + 1;
    return { entry: labQuiz(n, 'beugró'), exit: labQuiz(n, 'kiugró'), report: labReport(n) };
  });

  const originals = labTrios.map((trio, i) => {
    const n = i + 1;
    const laterLabExists = labTrios.slice(i + 1).some((later) => Boolean(later.entry || later.exit || later.report));
    return buildAttempt(
      'original',
      trio,
      labRoom(n),
      rules,
      now,
      rules.labs.defaultDates?.[String(n)],
      laterLabExists,
    );
  });

  // ---- assign retakes to the earliest failed lab that happened before them (or 'pass' lab for grade improvement) ----
  const retakeFor = new Map<number, LabAttempt>();
  for (const b of bundles) {
    if (!b.booked) continue;
    let idx = originals.findIndex(
      (o, i) => !retakeFor.has(i + 1) && (o.grade === 'fail' || o.status === 'absent') && (o.date ?? Infinity) <= (b.attempt.date ?? Infinity),
    );
    if (idx < 0) {
      idx = originals.findIndex(
        (o, i) => !retakeFor.has(i + 1) && o.grade === 'pass' && (o.date ?? Infinity) <= (b.attempt.date ?? Infinity),
      );
    }
    if (idx >= 0) retakeFor.set(idx + 1, b.attempt);
  }

  const tokensUsed = bundles.filter((b) => b.booked).length;
  const tokensLeft = Math.max(0, rules.labs.retakeTokens - tokensUsed);

  const labs: LabModel[] = originals.map((original, i) => {
    const n = i + 1;
    const retake = retakeFor.get(n) ?? null;
    const finalGrade = better(original.grade, retake?.grade ?? null);
    let result: LabModel['result'];
    if (finalGrade === 'pass' || finalGrade === 'excellent') result = 'completed';
    else if (original.status === 'upcoming' && !retake) result = 'upcoming';
    else result = tokensLeft > 0 || retake?.status === 'upcoming' ? 'at_risk' : 'failed';
    return { n, title: rules.labs.titles?.[String(n)] ?? rules.labs.titles?.[n] ?? `LAB${n}`, original, retake, finalGrade, result };
  });

  const signature = labs.some((l) => l.result === 'failed') ? 'failed' : labs.some((l) => l.result === 'at_risk') ? 'at_risk' : 'on_track';
  return {
    labs,
    tokensTotal: rules.labs.retakeTokens,
    tokensUsed,
    tokensLeft,
    passedCount: labs.filter((l) => l.result === 'completed').length,
    excellentCount: labs.filter((l) => l.finalGrade === 'excellent').length,
    signature,
  };
}

