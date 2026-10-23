import type { DashboardModel, HomeAssignmentModel, HomeAssignmentPhase, TaskModel, Level, Rules } from './types';
import type { HfStatus } from '../moodle/hfClient';
import { levelProgress, examPointsAt } from './levels';
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

  if (phases.registration) {
    phases.registration = {
      ...phases.registration,
      result: isRegistrationDone ? ('completed' as const) : phases.registration.result,
      completedOn: registrationDate || phases.registration.completedOn,
    };
  }
  if (phases.onboarding) {
    phases.onboarding = {
      ...phases.onboarding,
      result: isOnboardingDone ? ('completed' as const) : phases.onboarding.result,
      completedOn: onboardingDate || phases.onboarding.completedOn,
    };
  }
  if (phases.coding) {
    phases.coding = {
      ...phases.coding,
      result: isCodingDone ? ('completed' as const) : phases.coding.result,
      completedOn: codingDate || phases.coding.completedOn,
    };
  }
  if (phases.testing) {
    phases.testing = {
      ...phases.testing,
      result: isTestingDone ? ('completed' as const) : phases.testing.result,
      completedOn: testingDate || phases.testing.completedOn,
    };
  }
  if (phases.review) {
    phases.review = {
      ...phases.review,
      result: isReviewDone ? ('completed' as const) : phases.review.result,
      completedOn: reviewDate || phases.review.completedOn,
    };
  }

  const updatedHome: HomeAssignmentModel = {
    windowStartDate: model.homeAssignment?.windowStartDate || '',
    windowEndDate: model.homeAssignment?.windowEndDate || '',
    phases,
  };

  // 3. Update tasks status
  const updatedTasks: TaskModel[] = model.tasks.map((t) => {
    // Coding achievements
    if (t.key === 'codingStartCodingBy') {
      const askedDate = codingTask?.askedForEvaluationDate;
      if (askedDate || codingTask?.status === 'done' || isCodingDone) {
        return { ...t, status: 'completed' as const, isCurrent: false };
      }
    }
    if (t.key === 'codingCompleteCodingBy') {
      if (codingTask?.status === 'done' || isCodingDone) {
        return { ...t, status: 'completed' as const, isCurrent: false };
      }
    }
    if (t.key === 'codingFunctionalCorrectnessAtLeast') {
      if (isCodingDone || (codingTask?.status === 'done' && codingTask?.checkCodeCompiles !== false)) {
        return { ...t, status: 'completed' as const, isCurrent: false };
      }
    }
    if (t.key === 'codingSonarQubeCodingBugFree') {
      if (isCodingDone || (codingTask?.status === 'done' && codingTask?.checkSonar !== false)) {
        return { ...t, status: 'completed' as const, isCurrent: false };
      }
    }
    if (t.key === 'codingUnitTestCoverageAtLeast') {
      if (isCodingDone || codingTask?.status === 'done') {
        return { ...t, status: 'completed' as const, isCurrent: false };
      }
    }
    if (t.key === 'codingCompleteRefactorBy') {
      if (isCodingDone || refactorTask?.status === 'done') {
        return { ...t, status: 'completed' as const, isCurrent: false };
      }
    }
    if (t.key === 'codingSonarQubeRefactorBugFree') {
      if (isCodingDone || (refactorTask?.status === 'done' && refactorTask?.checkSonar !== false)) {
        return { ...t, status: 'completed' as const, isCurrent: false };
      }
    }

    // Onboarding achievements
    if (t.key === 'startOnboardingBy') {
      if (hf.onboardingFirstXmlUploadedDate || onboardingTask?.status === 'done' || isOnboardingDone) {
        return { ...t, status: 'completed' as const, isCurrent: false };
      }
    }
    if (t.key === 'completeOnboardingBy') {
      if (onboardingTask?.status === 'done' || isOnboardingDone) {
        return { ...t, status: 'completed' as const, isCurrent: false };
      }
    }

    // Registration achievements
    if (t.key === 'registerByDate') {
      if (isRegistrationDone) {
        return { ...t, status: 'completed' as const, isCurrent: false };
      }
    }

    // Testing achievements
    if (t.key === 'testingStartTestingBy' || t.key === 'testingCompleteTestingBy' || t.key === 'testingCorrectnessAndCompletenessAtLeast') {
      if (isTestingDone) {
        return { ...t, status: 'completed' as const, isCurrent: false };
      }
      if (isCodingDone && t.status === 'upcoming') {
        return { ...t, isCurrent: true };
      }
    }

    // Review achievements
    if (t.key.startsWith('review')) {
      if (isReviewDone) {
        return { ...t, status: 'completed' as const, isCurrent: false };
      }
      if (isTestingDone && t.status === 'upcoming') {
        return { ...t, isCurrent: true };
      }
    }

    return t;
  });

  // 4. Recalculate XP totals
  let tracked = 0;
  let mandatory = 0;
  let maxReachable = 0;

  for (const t of updatedTasks) {
    if (t.status === 'completed') {
      tracked += t.xp;
      if (t.type === 'mandatory') {
        mandatory += t.xp;
      }
    }
    if (t.status !== 'missed') {
      maxReachable += t.xp;
    }
  }

  // 5. Recalculate Level Progression
  const levels: Level[] = model.levels || defaultRules.levels;
  const levelInfo = levelProgress(levels, tracked);

  // 6. Recalculate Exam points
  const exam = examPointsAt(levels, levelInfo.level);
  const carried = examPointsAt(levels, levelProgress(levels, mandatory).level);

  const hfUpdatedDate = new Date(hf.fetchedAt || Date.now());
  const formattedHfDate = `${hfUpdatedDate.getFullYear()}. ${String(hfUpdatedDate.getMonth() + 1).padStart(2, '0')}. ${String(hfUpdatedDate.getDate()).padStart(2, '0')}. ${String(hfUpdatedDate.getHours()).padStart(2, '0')}:${String(hfUpdatedDate.getMinutes()).padStart(2, '0')}`;

  return {
    ...model,
    homeAssignment: updatedHome,
    tasks: updatedTasks,
    xp: { tracked, mandatory, maxReachable },
    level: {
      ...model.level,
      level: levelInfo.level,
      currentXp: levelInfo.currentXp,
      needed: levelInfo.needed,
      remaining: levelInfo.remaining,
      percent: levelInfo.percent,
      rarityPct: levels[levelInfo.level - 1]?.rarityPct || model.level.rarityPct,
    },
    points: {
      ...model.points,
      exam,
      midterm: carried,
      bonus: exam - carried,
      carried,
    },
    hfLastUpdated: formattedHfDate,
  };
}
