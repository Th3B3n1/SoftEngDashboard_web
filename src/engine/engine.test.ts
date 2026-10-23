import { describe, expect, it } from 'vitest';
import { rules } from './engine';
import { examPointsAt, forecast, levelProgress } from './levels';
import { applyHfDataToModel } from './hfIntegration';
import type { DashboardModel } from './types';

// ---------- pure rule math: values taken from the original dashboard ----------
describe('level & grade math (original dashboard: 147 XP → level 8, 21 points)', () => {
  const lv = rules.levels;
  it('level from XP', () => {
    const p = levelProgress(lv, 147);
    expect(p.level).toBe(8);
    expect(p.remaining).toBe(13); // "13 XP-t kell összegyűjtened"
    expect(levelProgress(lv, 0).level).toBe(1);
    expect(levelProgress(lv, 134).level).toBe(8);
    expect(levelProgress(lv, 133).level).toBe(7);
  });
  it('exam points and carried points', () => {
    expect(examPointsAt(lv, 8)).toBe(21);
    expect(examPointsAt(lv, levelProgress(lv, 78).level)).toBe(12); // mandatory XP 78 → carried 12
  });
  it('forecast table matches the original (level 8 and 9)', () => {
    expect(forecast(rules, 8).map((r) => r.neededPct)).toEqual([50, 50, 60, 79, 99]);
    expect(forecast(rules, 9).map((r) => r.neededPct)).toEqual([50, 50, 56, 74, 94]);
  });
});

describe('HF Portal live integration', () => {
  it('correctly upgrades coding phase and achievements from HF Portal status', () => {
    const mockModel: DashboardModel = {
      user: { id: 1, fullName: 'Test' },
      fetchedAt: Date.now(),
      labs: {
        labs: [],
        tokensTotal: 2,
        tokensUsed: 1,
        tokensLeft: 1,
        passedCount: 3,
        excellentCount: 3,
        signature: 'on_track',
      },
      homeAssignment: {
        windowStartDate: '2026-10-06T12:00:00',
        windowEndDate: '2026-12-08T12:00:00',
        phases: {
          registration: { name: 'Regisztráció', key: 'registration', result: 'completed', dueDate: '2026-10-13T12:00:00', completedOn: '2026-10-06T11:33:57.781Z' },
          onboarding: { name: 'Onboarding', key: 'onboarding', result: 'completed', dueDate: '2026-10-20T12:00:00', completedOn: '2026-10-14T11:13:06.551Z' },
          coding: { name: 'Kódolás', key: 'coding', result: 'upcoming', dueDate: '2026-11-03T12:00:00', completedOn: null },
          testing: { name: 'Tesztelés', key: 'testing', result: 'upcoming', dueDate: '2026-11-17T12:00:00', completedOn: null },
          review: { name: 'Review', key: 'review', result: 'upcoming', dueDate: '2026-12-01T12:00:00', completedOn: null },
        },
      },
      tasks: [
        { key: 'codingStartCodingBy', group: 'homeAssignment', sub: 'coding', xp: 20, type: 'optional', examOnly: false, due: '2026-10-23', source: 'untracked:homework', status: 'upcoming', dueAt: 0, dueStartAt: 0 },
        { key: 'codingCompleteCodingBy', group: 'homeAssignment', sub: 'coding', xp: 20, type: 'optional', examOnly: false, due: '2026-10-27', source: 'untracked:homework', status: 'upcoming', dueAt: 0, dueStartAt: 0 },
        { key: 'codingCompleteRefactorBy', group: 'homeAssignment', sub: 'coding', xp: 10, type: 'optional', examOnly: false, due: '2026-10-30', source: 'untracked:homework', status: 'upcoming', dueAt: 0, dueStartAt: 0 },
      ],
      xp: { tracked: 0, mandatory: 0, maxReachable: 50 },
      level: { level: 1, currentXp: 0, needed: 16, remaining: 16, percent: 0 },
      points: { exam: 0, imsc: 0, midterm: 0, bonus: 0, carried: 0 },
      official: null,
    };

    const mockHfStatus = {
      registrationCompletionDate: '2026-10-06T11:33:57.781Z',
      onboardingCompletionDate: '2026-10-14T11:13:06.551Z',
      codingCompletionDate: '2026-10-22T12:10:31.676Z',
      testingCompletionDate: null,
      reviewCompletionDate: null,
      status: 'coding_phase_done',
      phaseInstances: [
        {
          type: 'coding',
          status: 'done',
          completionDate: '2026-10-22T12:10:31.676Z',
          taskInstances: [
            { type: 'coding', status: 'done', completionDate: '2026-10-21T11:25:55.552Z', askedForEvaluationDate: '2026-10-20T23:38:09.000Z', checkCodeCompiles: true, checkSonar: true, checkBuild: true },
            { type: 'refactor', status: 'done', completionDate: '2026-10-22T12:10:31.676Z', checkCommitIsIntegrated: true, checkCodeCompiles: true, checkSonar: true },
          ],
        },
      ],
      fetchedAt: Date.now(),
    };

    const updated = applyHfDataToModel(mockModel, mockHfStatus);

    expect(updated.homeAssignment?.phases.coding.result).toBe('completed');
    expect(updated.homeAssignment?.phases.coding.completedOn).toBe('2026-10-22T12:10:31.676Z');

    expect(updated.tasks.find((t) => t.key === 'codingStartCodingBy')?.status).toBe('completed');
    expect(updated.tasks.find((t) => t.key === 'codingCompleteCodingBy')?.status).toBe('completed');
    expect(updated.tasks.find((t) => t.key === 'codingCompleteRefactorBy')?.status).toBe('completed');

    expect(updated.xp.tracked).toBe(50);
    expect(updated.level.level).toBeGreaterThan(1);
    expect(updated.hfLastUpdated).toBeTruthy();
  });
});

describe('evaluateTasks availability (isCurrent)', () => {
  it('correctly sets isCurrent based on Moodle presence and dates', async () => {
    const { evaluateTasks } = await import('./tasks');
    const { computeLabs } = await import('./labs');

    // Oct 23, 2026: Lab 1, 2, 3 happened; Lab 4 on Oct 28
    const mockNow = new Date('2026-10-23T14:00:00').getTime();

    const mockSnap = {
      user: { id: 1, fullName: 'Test' },
      fetchedAt: mockNow,
      quizzes: [
        { cmid: 101, course: 1, name: 'LAB1: beugró', timeOpen: 1789000000, timeClose: 0, attempts: 1, bestGrade: 2, completionState: 1, timeCompleted: 1789001000 },
        { cmid: 102, course: 1, name: 'LAB1: kiugró', timeOpen: 1789000000, timeClose: 0, attempts: 1, bestGrade: 2, completionState: 1, timeCompleted: 1789002000 },
        { cmid: 201, course: 1, name: 'LAB2: beugró', timeOpen: 1790000000, timeClose: 0, attempts: 1, bestGrade: 2, completionState: 1, timeCompleted: 1790001000 },
        { cmid: 202, course: 1, name: 'LAB2: kiugró', timeOpen: 1790000000, timeClose: 0, attempts: 1, bestGrade: 2, completionState: 1, timeCompleted: 1790002000 },
        { cmid: 301, course: 1, name: 'LAB3: beugró', timeOpen: 1791000000, timeClose: 0, attempts: 1, bestGrade: 2, completionState: 1, timeCompleted: 1791001000 },
        { cmid: 302, course: 1, name: 'LAB3: kiugró', timeOpen: 1791000000, timeClose: 0, attempts: 1, bestGrade: 2, completionState: 1, timeCompleted: 1791002000 },
        // Lab 4 quiz in Moodle
        { cmid: 401, course: 1, name: 'LAB4: beugró', timeOpen: 1793000000, timeClose: 0, attempts: 0, bestGrade: 0, completionState: 0, timeCompleted: null },
      ],
      assignments: [
        { cmid: 103, name: 'LAB1: jegyzőkönyv', dueDate: 0, gradingDueDate: 0, submissionStatus: 'submitted', gradingStatus: 'graded', gradeText: 'kiválóan megfelelt' },
        { cmid: 203, name: 'LAB2: jegyzőkönyv', dueDate: 0, gradingDueDate: 0, submissionStatus: 'submitted', gradingStatus: 'graded', gradeText: 'kiválóan megfelelt' },
        { cmid: 303, name: 'LAB3: jegyzőkönyv', dueDate: 0, gradingDueDate: 0, submissionStatus: 'submitted', gradingStatus: 'graded', gradeText: 'kiválóan megfelelt' },
      ],
      groups: [],
    };

    const labsModel = computeLabs(mockSnap as any, rules, mockNow);
    const evaluated = evaluateTasks(mockSnap as any, rules, labsModel, mockNow);

    // Completed labs: not isCurrent
    const lab1Task = evaluated.find((t) => t.key === 'lab1Excellent');
    expect(lab1Task?.status).toBe('completed');
    expect(lab1Task?.isCurrent).toBe(false);

    // Lab 4 (upcoming on Oct 28, has quiz in Moodle): isCurrent = true
    const lab4Task = evaluated.find((t) => t.key === 'lab4Excellent');
    expect(lab4Task?.status).toBe('upcoming');
    expect(lab4Task?.isCurrent).toBe(true);

    // Lab 5 (in November, no presence in Moodle): isCurrent = false
    const lab5Task = evaluated.find((t) => t.key === 'lab5Excellent');
    expect(lab5Task?.status).toBe('upcoming');
    expect(lab5Task?.isCurrent).toBe(false);

    // Coding tasks (active phase Oct 20 - Nov 3): isCurrent = true
    const codingTask = evaluated.find((t) => t.key === 'codingCompleteCodingBy');
    expect(codingTask?.isCurrent).toBe(true);

    // Testing tasks (starts Nov 3, in the future): isCurrent = false
    const testingTask = evaluated.find((t) => t.key === 'testingStartTestingBy');
    expect(testingTask?.isCurrent).toBe(false);
  });
});

