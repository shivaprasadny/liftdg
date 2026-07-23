import { addDays, endOfMonth, endOfWeek, format, isValid, parse, parseISO, startOfMonth, startOfWeek } from 'date-fns';

import { daypartDefaultTimes, type Daypart } from '@/constants/scheduledWorkout';
import type { ScheduledWorkout } from '@/types/scheduledWorkout';
import type { FirstDayOfWeek } from '@/types/settings';
import { AppError } from '@/utils/errors';

const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
export function plannerGridRange(month:Date,firstDay:FirstDayOfWeek){const weekStartsOn=firstDay as 0|1;return{from:startOfWeek(startOfMonth(month),{weekStartsOn}),to:endOfWeek(endOfMonth(month),{weekStartsOn})};}

/** Auto-inserts slashes for a MM/DD/YYYY date field — same pattern as bodyMeasurementService's date-of-birth input, kept separate for a calendar-appropriate error message. */
export function maskScheduledDateInput(value: string, previous = ''): string {
  let digits = value.replace(/\D/g, '').slice(0, 8);
  if (value.length < previous.length && previous.endsWith('/') && !value.endsWith('/')) digits = digits.slice(0, -1);
  if (digits.length < 2) return digits;
  if (digits.length === 2) return `${digits}/`;
  if (digits.length < 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  if (digits.length === 4) return `${digits.slice(0, 2)}/${digits.slice(2)}/`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
export function isoToScheduledDateDisplay(value: string): string {
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, 'MM/dd/yyyy') : '';
}
/** Converts a masked MM/DD/YYYY field to the canonical local YYYY-MM-DD stored on scheduled_workouts. */
export function scheduledDateDisplayToIso(value: string): string {
  if (!datePattern.test(value)) throw new AppError('Enter the date as MM/DD/YYYY.');
  const parsed = parse(value, 'MM/dd/yyyy', new Date());
  if (!isValid(parsed) || format(parsed, 'MM/dd/yyyy') !== value) throw new AppError('Enter a valid date.');
  return format(parsed, 'yyyy-MM-dd');
}

function effectiveSortTime(item: Pick<ScheduledWorkout, 'startTime' | 'daypart'>): string {
  if (item.startTime) return item.startTime;
  const daypart: Daypart = item.daypart ?? 'anytime';
  return daypartDefaultTimes[daypart];
}
/** Exact start time first, then daypart, then created order (DECISIONS.md #46 — no manual display-order field yet). */
export function compareScheduledWorkouts(a: ScheduledWorkout, b: ScheduledWorkout): number {
  const byTime = effectiveSortTime(a).localeCompare(effectiveSortTime(b));
  return byTime !== 0 ? byTime : a.createdAt.localeCompare(b.createdAt);
}

/**
 * Maps a 1-based program week/day to a local calendar date (DECISIONS.md #47). No weekday
 * preferences exist yet — week N day D is simply the ((N-1)*7 + (D-1))th day after the start date,
 * so a 4-day/week program occupies the first 4 days of each 7-day block and the rest are unscheduled
 * (no rest-day calendar rows yet either). Timezone-safe: pure date-fns day arithmetic on a parsed
 * local YYYY-MM-DD, never a UTC instant.
 */
export function calculateProgramOccurrenceDate(startDateIso: string, weekNumber: number, dayNumber: number): string {
  const offset = (weekNumber - 1) * 7 + (dayNumber - 1);
  return format(addDays(parseISO(startDateIso), offset), 'yyyy-MM-dd');
}
/** Last calendar day of the program's final week, for a simple "Ends: ..." preview before starting. */
export function calculateProgramEndDate(startDateIso: string, durationWeeks: number): string {
  return format(addDays(parseISO(startDateIso), durationWeeks * 7 - 1), 'yyyy-MM-dd');
}

export interface ScheduledWorkoutDaySection { date: string; items: ScheduledWorkout[]; }
export function groupScheduledWorkoutsByDate(items: ScheduledWorkout[]): ScheduledWorkoutDaySection[] {
  const byDate = new Map<string, ScheduledWorkout[]>();
  for (const item of items) byDate.set(item.scheduledDate, [...(byDate.get(item.scheduledDate) ?? []), item]);
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayItems]) => ({ date, items: [...dayItems].sort(compareScheduledWorkouts) }));
}
