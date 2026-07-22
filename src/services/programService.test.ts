import { describe, expect, it } from 'vitest';

import { countProgramTrainingDays, describeProgramDay, formatProgramLength, isProgramDayMissingContent } from './programService';
import type { ProgramDay, ProgramTemplateWithWeeks } from '@/types/program';
import type { WorkoutPlan } from '@/types/workoutPlan';

const plan: WorkoutPlan = { id: 'plan-1', name: 'Push and Core', description: null, color: null, workoutType: 'strength',
  isBuiltin: true, isArchived: false, createdAt: '2026-01-01', updatedAt: '2026-01-01', exerciseCount: 9, estimatedSetCount: 27 };

const trainingDay: ProgramDay = { id: 'day-1', programWeekId: 'week-1', dayNumber: 1, dayLabel: 'Push and Core',
  planId: 'plan-1', workoutType: 'strength', isRestDay: false, isOptional: false, notes: null, displayOrder: 0,
  estimatedDurationMinutes: 55, plan };
const restDay: ProgramDay = { ...trainingDay, id: 'day-2', dayLabel: 'Rest', planId: null, workoutType: null, isRestDay: true, plan: null };

describe('formatProgramLength', () => {
  it('formats weeks and days per week', () => expect(formatProgramLength({ durationWeeks: 8, daysPerWeek: 4 })).toBe('8 weeks · 4 days/week'));
  it('singularizes a one-week, one-day program', () => expect(formatProgramLength({ durationWeeks: 1, daysPerWeek: 1 })).toBe('1 week · 1 day/week'));
});

describe('describeProgramDay', () => {
  it('describes a rest day plainly', () => expect(describeProgramDay(restDay)).toBe('Rest day'));
  it('includes the workout type alongside the day label', () => expect(describeProgramDay(trainingDay)).toBe('Push and Core (Strength)'));
  it('falls back to the linked plan name when there is no day label', () => expect(describeProgramDay({ ...trainingDay, dayLabel: null })).toBe('Push and Core (Strength)'));
});

describe('countProgramTrainingDays', () => {
  const program: Pick<ProgramTemplateWithWeeks, 'weeks'> = { weeks: [
    { id: 'w1', programId: 'p', weekNumber: 1, title: null, focus: null, notes: null, isDeload: false, isAssessment: false, days: [trainingDay, restDay] },
    { id: 'w2', programId: 'p', weekNumber: 2, title: null, focus: null, notes: null, isDeload: false, isAssessment: false, days: [trainingDay, trainingDay] },
  ] };
  it('counts only non-rest days across all weeks', () => expect(countProgramTrainingDays(program)).toBe(3));
});

describe('isProgramDayMissingContent', () => {
  it('is false for a rest day with no plan', () => expect(isProgramDayMissingContent(restDay)).toBe(false));
  it('is false for a training day whose plan resolved', () => expect(isProgramDayMissingContent(trainingDay)).toBe(false));
  it('is true when a plan was linked but no longer resolves', () => expect(isProgramDayMissingContent({ ...trainingDay, plan: null })).toBe(true));
});
