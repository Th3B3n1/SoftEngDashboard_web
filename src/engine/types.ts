import type { MoodleSnapshot } from '../moodle/types';

export interface Reward {
  type: 'exam_point' | 'imsc_point' | 'proposed_grade';
  amount?: number;
  grade?: number;
}
export interface Level {
  xpToLevelUp: number;
  rewards?: Reward[];
  levelRewards?: Reward[];
  rarityPct?: number;
}
export type TaskSource =
  | 'labs'
  | 'recapQuiz'
  | 'lectureQuiz'
  | 'cmid'
  | 'untracked:homework'
  | 'untracked:extra'
  | 'untracked:manual';

export type UnlockCondition =
  | { type: 'another_task'; taskKey: string }
  | { type: 'level_reached'; level: number };

export interface EvaluatedUnlockCondition {
  condition: UnlockCondition;
  met: boolean;
  status: 'completed' | 'missed' | 'current' | 'upcoming';
}

export interface TaskRule {
  key: string;
  group: string;
  sub: string;
  xp: number;
  type: 'mandatory' | 'optional';
  examOnly: boolean;
  /** 'YYYY-MM-DD' or [start, end] */
  due: string | [string, string];
  availableFrom?: string;
  source: TaskSource;
  cmid?: number;
  unlockConditions?: UnlockCondition[];
}
export interface Rules {
  courseId: number;
  levels: Level[];
  gradeInfo: { pointsCollectableOnTheExam: number; examPassThreshold: number; gradeThresholds: number[] };
  labs: {
    count: number;
    retakeTokens: number;
    entryPassGrade: number;
    exitPassGrade: number;
    titles?: Record<string, string>;
    defaultDates?: Record<string, string>;
  };
  homeAssignment?: {
    windowStartDate: string;
    windowEndDate: string;
    phases: Record<string, Partial<HomeAssignmentPhase>>;
  };
  tasks: TaskRule[];
}

export type LabGrade = 'excellent' | 'pass' | 'fail';
export type ReportState = 'excellent' | 'graded' | 'submitted' | 'none';

export interface LabAttempt {
  kind: 'original' | 'retake';
  /** unix ms; null if the quiz isn't visible yet */
  date: number | null;
  room: string | null;
  status: 'upcoming' | 'attended' | 'absent';
  entryPassed: boolean | null;
  exitMet: boolean | null;
  report: ReportState;
  grade: LabGrade | null;
  /** retake only: consumes a token */
  usesToken?: boolean;
}

export type LabResult = 'completed' | 'upcoming' | 'at_risk' | 'failed';

export interface LabModel {
  n: number;
  title: string;
  original: LabAttempt;
  retake: LabAttempt | null;
  /** best of original/retake */
  finalGrade: LabGrade | null;
  result: LabResult;
}

export interface LabsModel {
  labs: LabModel[];
  tokensTotal: number;
  tokensUsed: number;
  tokensLeft: number;
  passedCount: number;
  excellentCount: number;
  signature: 'on_track' | 'at_risk' | 'failed';
}

export type TaskStatus = 'completed' | 'upcoming' | 'missed' | 'untracked';

export interface TaskModel extends TaskRule {
  status: TaskStatus;
  baseStatus?: TaskStatus;
  baseIsCurrent?: boolean;
  /** unix ms (end of the last due day) */
  dueAt: number;
  dueStartAt: number;
  completedAt?: number;
  rarityPct?: number;
  lockStatus?: 'locked' | 'unlocked';
  unlockConditions?: UnlockCondition[];
  evaluatedConditions?: EvaluatedUnlockCondition[];
  isCurrent?: boolean;
}

export type GradeKey = 'fail' | 'pass' | 'satisfactory' | 'good' | 'excellent';
export const GRADE_KEYS: GradeKey[] = ['fail', 'pass', 'satisfactory', 'good', 'excellent'];

export interface HomeAssignmentPhase {
  name: string;
  key: string;
  result: 'completed' | 'upcoming' | 'at_risk' | 'failed';
  dueDate: string;
  availableFrom?: string;
  lateSubmissionDate?: string;
  completedOn?: string | null;
  lateSubmissionFeeCharged?: boolean;
}

export interface HomeAssignmentModel {
  windowStartDate: string;
  windowEndDate: string;
  phases: Record<string, HomeAssignmentPhase>;
}

export interface DashboardModel {
  user: MoodleSnapshot['user'];
  fetchedAt: number;
  lastUpdatedOn?: string;
  moodleLastUpdated?: string;
  hfLastUpdated?: string | null;
  labs: LabsModel;
  homeAssignment?: HomeAssignmentModel;
  tasks: TaskModel[];
  xp: { tracked: number; mandatory: number; maxReachable: number };
  level: { level: number; currentXp: number; needed: number; remaining: number; percent: number; rarityPct?: number; maxReachableLevel?: number };
  points: { exam: number; imsc: number; midterm: number; bonus: number; carried: number };
  official: { gradeText: string | null; updatedAt: string | null } | null;
  gradeInfo?: { pointsCollectableOnTheExam: number; examPassThreshold: number; gradeThresholds: number[] };
  levels?: Level[];
}
