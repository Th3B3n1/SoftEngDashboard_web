/** Raw per-student data pulled from Moodle. Everything the engine needs, nothing else. */
export interface QuizInfo {
  cmid: number;
  id: number;
  name: string;
  /** unix seconds, 0 = none */
  timeOpen: number;
  timeClose: number;
  maxGrade: number;
  bestGrade: number | null;
  /** finished attempts */
  attempts: number;
  /** Moodle completion state: 0 incomplete, 1 complete, 2 complete+pass, 3 complete+fail; null = not tracked */
  completionState: number | null;
  /** unix seconds */
  timeCompleted: number | null;
}

export interface AssignInfo {
  cmid: number;
  id: number;
  name: string;
  dueDate: number;
  submissionStatus: string | null;
  gradingStatus: string | null;
  gradeText: string | null;
  /** plain-text feedback comment (used for the staff "Dashboard" assignment) */
  feedbackText: string | null;
}

export interface MoodleSnapshot {
  /** unix ms when this snapshot was taken */
  fetchedAt: number;
  user: { id: number; fullName: string };
  courseId: number;
  groups: string[];
  quizzes: QuizInfo[];
  assignments: AssignInfo[];
}

