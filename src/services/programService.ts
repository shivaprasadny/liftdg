import { workoutPlanTypeLabels } from '@/constants/workoutPlanTypes';
import type { ProgramDay, ProgramTemplate, ProgramTemplateWithWeeks } from '@/types/program';

export function formatProgramLength(program: Pick<ProgramTemplate, 'durationWeeks' | 'daysPerWeek'>): string {
  const weeks = `${program.durationWeeks} week${program.durationWeeks === 1 ? '' : 's'}`;
  const days = `${program.daysPerWeek} day${program.daysPerWeek === 1 ? '' : 's'}/week`;
  return `${weeks} · ${days}`;
}

export function describeProgramDay(day: Pick<ProgramDay, 'isRestDay' | 'dayLabel' | 'workoutType' | 'plan'>): string {
  if (day.isRestDay) return 'Rest day';
  const label = day.dayLabel ?? day.plan?.name ?? 'Workout';
  const type = day.workoutType ? workoutPlanTypeLabels[day.workoutType] : null;
  return type ? `${label} (${type})` : label;
}

/** Training days only — excludes explicit rest days. Used for "N workouts" summaries. */
export function countProgramTrainingDays(program: Pick<ProgramTemplateWithWeeks, 'weeks'>): number {
  return program.weeks.reduce((sum, week) => sum + week.days.filter((day) => !day.isRestDay).length, 0);
}

/** A day is missing its content when it's neither a rest day nor linked to a plan that still resolves. */
export function isProgramDayMissingContent(day: Pick<ProgramDay, 'isRestDay' | 'planId' | 'plan'>): boolean {
  return !day.isRestDay && day.planId !== null && day.plan === null;
}
