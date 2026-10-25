import type { DashboardModel, HomeAssignmentModel, HomeAssignmentPhase, TaskModel, Level, Rules } from './types';
import type { HfStatus } from '../moodle/hfClient';
import { fmtTimestamp } from '../format';
import { computeStatsFromTasks } from './levels';
import rulesJson from '../rules/rules.json';

const defaultRules = rulesJson as unknown as Rules;

export function applyHfDataToModel(model: DashboardModel, hf: HfStatus): DashboardModel {
  // 1. Identify phase instances & statuses
  const regPhase = hf.phaseInstances?.find((p) => p.type === 'registration');
  const onboardingPhase = hf.phaseInstances?.find((p) => p.type === 'onboarding');
  const onboardingTask = onboardingPhase?.taskInstances?.find((t) => t.type === 'onboarding');

  const codingPhase = hf.phaseInstances?.find((p) => p.type === 'coding');
  const codingTask = codingPhase?.taskInstances?.find((t) => t.type === 'coding');
  const refactorTask = codingPhase?.taskInstances?.find((t) => t.type === 'refactor');

  const testingPhase = hf.phaseInstances?.find((p) => p.type === 'testing');
  const reviewPhase = hf.phaseInstances?.find((p) => p.type === 'review');

  const isCodingDone = Boolean(
    hf.codingCompletionDate ||
    codingPhase?.status === 'done' ||
    hf.status === 'coding_phase_done' ||
    (hf.raw && (hf.raw.codingCompletionDate || hf.raw.status === 'coding_phase_done'))
  );
  const codingDate = hf.codingCompletionDate || codingPhase?.completionDate || null;

  const isOnboardingDone = Boolean(
    hf.onboardingCompletionDate ||
    onboardingPhase?.status === 'done' ||
    hf.status?.includes('onboarding') ||
    isCodingDone
  );
  const onboardingDate = hf.onboardingCompletionDate || onboardingPhase?.completionDate || null;

  const isRegistrationDone = Boolean(
    hf.registrationCompletionDate ||
    regPhase?.status === 'done' ||
    hf.status?.includes('registration') ||
    isOnboardingDone ||
    isCodingDone
  );
  const registrationDate = hf.registrationCompletionDate || regPhase?.completionDate || null;

  const isTestingDone = Boolean(
    hf.testingCompletionDate ||
    testingPhase?.status === 'done' ||
    hf.status === 'testing_phase_done'
  );
  const testingDate = hf.testingCompletionDate || testingPhase?.completionDate || null;

  const isReviewDone = Boolean(
    hf.reviewCompletionDate ||
    reviewPhase?.status === 'done' ||
    hf.status === 'review_phase_done'
  );
  const reviewDate = hf.reviewCompletionDate || reviewPhase?.completionDate || null;

  // 2. Update Home Assignment phases from model base
  const rawPhases = model.homeAssignment?.phases ?? {};
  const phases: Record<string, HomeAssignmentPhase> = { ...rawPhases };

  const markPhase = (key: string, done: boolean, date: string | null) => {
    if (phases[key]) {
      phases[key] = {
        ...phases[key],
        result: done ? 'completed' : phases[key].result,
        completedOn: date || phases[key].completedOn,
      };
    }
  };

  markPhase('registration', isRegistrationDone, registrationDate);
  markPhase('onboarding', isOnboardingDone, onboardingDate);
  markPhase('coding', isCodingDone, codingDate);
  markPhase('testing', isTestingDone, testingDate);
  markPhase('review', isReviewDone, reviewDate);

  const updatedHome: HomeAssignmentModel = {
    windowStartDate: model.homeAssignment?.windowStartDate || '',
    windowEndDate: model.homeAssignment?.windowEndDate || '',
    phases,
  };

  // 3. Update tasks status
  const updatedTasks: TaskModel[] = model.tasks.map((t) => {
    const complete = (): TaskModel => ({ ...t, status: 'completed', isCurrent: false });

    // Coding achievements
    if (t.key === 'codingStartCodingBy' && (codingTask?.askedForEvaluationDate || codingTask?.status === 'done' || isCodingDone)) {
      return complete();
    }
    if (t.key === 'codingCompleteCodingBy' && (codingTask?.status === 'done' || isCodingDone)) {
      return complete();
    }
    if (t.key === 'codingFunctionalCorrectnessAtLeast' && (isCodingDone || (codingTask?.status === 'done' && codingTask?.checkCodeCompiles !== false))) {
      return complete();
    }
    if (t.key === 'codingSonarQubeCodingBugFree' && (isCodingDone || (codingTask?.status === 'done' && codingTask?.checkSonar !== false))) {
      return complete();
    }
    if (t.key === 'codingUnitTestCoverageAtLeast' && (isCodingDone || codingTask?.status === 'done')) {
      return complete();
    }
    if (t.key === 'codingCompleteRefactorBy' && (isCodingDone || refactorTask?.status === 'done')) {
      return complete();
    }
    if (t.key === 'codingSonarQubeRefactorBugFree' && (isCodingDone || (refactorTask?.status === 'done' && refactorTask?.checkSonar !== false))) {
      return complete();
    }

    // Onboarding achievements
    if (t.key === 'startOnboardingBy' && (hf.onboardingFirstXmlUploadedDate || onboardingTask?.status === 'done' || isOnboardingDone)) {
      return complete();
    }
    if (t.key === 'completeOnboardingBy' && (onboardingTask?.status === 'done' || isOnboardingDone)) {
      return complete();
    }

    // Registration achievements
    if (t.key === 'registerByDate' && isRegistrationDone) {
      return complete();
    }

    // Testing achievements
    if (t.key === 'testingStartTestingBy' || t.key === 'testingCompleteTestingBy' || t.key === 'testingCorrectnessAndCompletenessAtLeast') {
      if (isTestingDone) return complete();
      if (isCodingDone && t.status === 'upcoming') return { ...t, isCurrent: true };
    }

    // Review achievements
    if (t.key.startsWith('review')) {
      if (isReviewDone) return complete();
      if (isTestingDone && t.status === 'upcoming') return { ...t, isCurrent: true };
    }

    return t;
  });

  // 4. Recalculate XP totals, Level Progression, and Exam points
  const levels: Level[] = model.levels || defaultRules.levels;
  const { xp, level, points } = computeStatsFromTasks(updatedTasks, levels);

  return {
    ...model,
    homeAssignment: updatedHome,
    tasks: updatedTasks,
    xp,
    level: {
      ...model.level,
      ...level,
      rarityPct: level.rarityPct ?? model.level.rarityPct,
    },
    points: {
      ...model.points,
      ...points,
    },
    hfLastUpdated: fmtTimestamp(hf.fetchedAt || Date.now()),
  };
}
