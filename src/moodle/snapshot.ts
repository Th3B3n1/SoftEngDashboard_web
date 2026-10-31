import { callBatch, callWs } from './client';
import type { AssignInfo, MoodleSnapshot, QuizInfo } from './types';

interface SiteInfo {
  userid: number;
  fullname: string;
}
interface GroupsRes {
  groups: { name: string }[];
}
interface QuizzesRes {
  quizzes: { id: number; coursemodule: number; name: string; timeopen: number; timeclose: number; grade: number }[];
}
interface AssignsRes {
  courses: { assignments: { id: number; cmid: number; name: string; duedate: number }[] }[];
}
interface CompletionRes {
  statuses: { cmid: number; state: number; timecompleted: number }[];
}
interface SubmissionStatus {
  lastattempt?: { submission?: { status?: string }; gradingstatus?: string };
  feedback?: {
    gradefordisplay?: string;
    plugins?: { type: string; editorfields?: { text?: string }[] }[];
  };
}
interface BestGrade {
  hasgrade: boolean;
  grade?: number;
}
interface Attempts {
  attempts: unknown[];
}
interface MobileContentRes {
  templates?: { id: string; html: string }[];
  otherdata?: Record<string, unknown>;
}

const stripHtml = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

/** Assignments whose status the engine cares about (lab reports, retake reports, staff dashboard). */
const RELEVANT_ASSIGN = /^LAB\d+:\s*jegyzőkönyv|^Pótlabor .*jegyzőkönyv|\(Dashboard\)/i;

async function fetchAttendanceCompleted(
  token: string,
  courseId: number,
  userid: number,
  cmid: number,
): Promise<boolean> {
  const res = await callWs<MobileContentRes>(token, 'tool_mobile_get_content', {
    component: 'mod_attendance',
    method: 'mobile_view_activity',
    args: [
      { name: 'cmid', value: String(cmid) },
      { name: 'courseid', value: String(courseId) },
      { name: 'userid', value: String(userid) },
    ],
  }).catch(() => null);

  if (!res) return false;
  const html = stripHtml((res.templates ?? []).map((t) => t.html).join(' '));
  const otherStr = JSON.stringify(res.otherdata ?? {});
  return (
    /[1-9]\d*\s*\/\s*[1-9]\d*/.test(html) ||
    /100([.,]0+)?\s*%/.test(html) ||
    /Jelen|Present|Teljesítve|Megfelelt/i.test(html) ||
    /"(taken|points|percentage)"\s*:\s*[1-9]/.test(otherStr)
  );
}

export async function fetchSnapshot(
  token: string,
  courseId: number,
  onProgress?: (msg: string) => void,
): Promise<MoodleSnapshot> {
  onProgress?.('Felhasználó azonosítása…');
  const info = await callWs<SiteInfo>(token, 'core_webservice_get_site_info');
  const userid = info.userid;

  onProgress?.('Kurzusadatok letöltése…');
  const [groups, quizzesRes, assignsRes, completion, attended226035] = await Promise.all([
    callWs<GroupsRes>(token, 'core_group_get_course_user_groups', { courseid: courseId, userid }),
    callWs<QuizzesRes>(token, 'mod_quiz_get_quizzes_by_courses', { courseids: [courseId] }),
    callWs<AssignsRes>(token, 'mod_assign_get_assignments', { courseids: [courseId] }),
    callWs<CompletionRes>(token, 'core_completion_get_activities_completion_status', { courseid: courseId, userid }),
    fetchAttendanceCompleted(token, courseId, userid, 226035),
  ]);

  if (attended226035 && !completion.statuses.some((s) => s.cmid === 226035 && (s.state === 1 || s.state === 2))) {
    completion.statuses = [
      ...completion.statuses.filter((s) => s.cmid !== 226035),
      { cmid: 226035, state: 1, timecompleted: 0 },
    ];
  }

  const completionByCm = new Map(completion.statuses.map((s) => [s.cmid, s]));
  const quizzes = quizzesRes.quizzes;
  const assigns = (assignsRes.courses[0]?.assignments ?? []).filter((a) => RELEVANT_ASSIGN.test(a.name));

  onProgress?.(`Kvízek és beadandók állapota (${quizzes.length + assigns.length} lekérdezés)…`);
  const results = await callBatch(token, [
    ...quizzes.map((q) => ({ fn: 'mod_quiz_get_user_best_grade', args: { quizid: q.id, userid } })),
    ...quizzes.map((q) => ({
      fn: 'mod_quiz_get_user_attempts',
      args: { quizid: q.id, userid, status: 'finished' },
    })),
    ...assigns.map((a) => ({ fn: 'mod_assign_get_submission_status', args: { assignid: a.id, userid } })),
  ]);

  const nq = quizzes.length;
  const quizInfos: QuizInfo[] = quizzes.map((q, i) => {
    const best = results[i] as BestGrade | null;
    const att = results[nq + i] as Attempts | null;
    const comp = completionByCm.get(q.coursemodule);
    return {
      cmid: q.coursemodule,
      id: q.id,
      name: q.name,
      timeOpen: q.timeopen,
      timeClose: q.timeclose,
      maxGrade: q.grade,
      bestGrade: best?.hasgrade && best.grade !== undefined ? best.grade : null,
      attempts: att?.attempts.length ?? 0,
      completionState: comp ? comp.state : null,
      timeCompleted: comp && comp.timecompleted ? comp.timecompleted : null,
    };
  });

  const assignInfos: AssignInfo[] = assigns.map((a, i) => {
    const s = results[2 * nq + i] as SubmissionStatus | null;
    const comments = s?.feedback?.plugins?.find((p) => p.type === 'comments')?.editorfields?.[0]?.text;
    return {
      cmid: a.cmid,
      id: a.id,
      name: a.name,
      dueDate: a.duedate,
      submissionStatus: s?.lastattempt?.submission?.status ?? null,
      gradingStatus: s?.lastattempt?.gradingstatus ?? null,
      gradeText: s?.feedback?.gradefordisplay ? stripHtml(s.feedback.gradefordisplay) : null,
      feedbackText: comments ? stripHtml(comments) : null,
    };
  });

  return {
    fetchedAt: Date.now(),
    user: { id: userid, fullName: info.fullname },
    courseId,
    groups: groups.groups.map((g) => g.name),
    quizzes: quizInfos,
    assignments: assignInfos,
    completions: completion.statuses.map((s) => ({
      cmid: s.cmid,
      state: s.state,
      timeCompleted: s.timecompleted || null,
    })),
  };
}

