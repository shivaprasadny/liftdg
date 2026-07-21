import {
  differenceInCalendarDays, differenceInCalendarWeeks, endOfDay,
  format, startOfDay, startOfMonth, startOfWeek, startOfYear, subDays, subMonths,
} from 'date-fns';

import type { ExerciseSetRow } from '@/repositories/statisticsRepository';
import type {
  ComparisonValue, ExerciseProgressPoint, ExerciseProgressSummary, ProgressChartMetric,
  StatisticsDatePreset, StatisticsDateRange, StreakSummary, VolumeTrendGrouping,
  VolumeTrendPoint, WorkoutFrequencyPoint,
} from '@/types/statistics';

const WEEK_STARTS_ON = 1; // Monday, matching workoutHistoryService's existing convention.

/**
 * Local-day boundaries as ISO instants. `now` is parsed by the JS Date constructor and all
 * boundaries are derived with date-fns local-time helpers, so a device's timezone offset is
 * applied once here rather than by comparing raw UTC strings later.
 */
export function getStatisticsDateRange(
  preset: StatisticsDatePreset, now = new Date(), custom?: { from: string; to: string },
): StatisticsDateRange {
  if (preset === 'all') return { preset, from: null, to: null, previousFrom: null, previousTo: null };

  let from: Date; let to: Date;
  if (preset === 'custom') {
    if (!custom) throw new Error('Custom date range requires from/to.');
    from = startOfDay(new Date(custom.from)); to = endOfDay(new Date(custom.to));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new Error('Enter a valid date range.');
    }
  } else if (preset === 'week') { from = startOfWeek(now, { weekStartsOn: WEEK_STARTS_ON }); to = endOfDay(now); }
  else if (preset === 'month') { from = startOfMonth(now); to = endOfDay(now); }
  else if (preset === '30d') { from = startOfDay(subDays(now, 30)); to = endOfDay(now); }
  else if (preset === '3m') { from = startOfDay(subMonths(now, 3)); to = endOfDay(now); }
  else if (preset === '6m') { from = startOfDay(subMonths(now, 6)); to = endOfDay(now); }
  else { from = startOfYear(now); to = endOfDay(now); }

  // Previous period is the immediately preceding span of equal length, so a partial "this week"
  // or "this month" still gets a fair (equal-duration) comparison instead of a full calendar unit.
  const durationMs = to.getTime() - from.getTime();
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(previousTo.getTime() - durationMs);
  return { preset, from: from.toISOString(), to: to.toISOString(), previousFrom: previousFrom.toISOString(), previousTo: previousTo.toISOString() };
}

export function calculatePercentChange(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export function buildComparison(current: number, previous: number | null): ComparisonValue {
  return { current, previous, percentChange: calculatePercentChange(current, previous) };
}

/** A "workout day" is the device-local calendar day of a completed workout's `completedAt`. */
function toLocalDayKey(iso: string): string { return format(new Date(iso), 'yyyy-MM-dd'); }

/**
 * Current streak stays alive through "today" even if today has no workout yet (the day isn't
 * over), but breaks once a full calendar day is skipped. Longest streak scans all-time history.
 * Both intentionally ignore the active date-range filter — see DECISIONS.md.
 */
export function calculateStreaks(completedWorkoutDates: string[], now = new Date()): StreakSummary {
  if (completedWorkoutDates.length === 0) return { currentStreakDays: 0, longestStreakDays: 0, activeDays: 0, averageWorkoutsPerWeek: 0 };

  const dayKeys = Array.from(new Set(completedWorkoutDates.map(toLocalDayKey))).sort();
  const days = dayKeys.map((key) => startOfDay(new Date(`${key}T00:00:00`)));

  let longestStreakDays = 1; let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    run = differenceInCalendarDays(days[i], days[i - 1]) === 1 ? run + 1 : 1;
    longestStreakDays = Math.max(longestStreakDays, run);
  }

  const latestDay = days[days.length - 1];
  const gapFromToday = differenceInCalendarDays(startOfDay(now), latestDay);
  let currentStreakDays = 0;
  if (gapFromToday <= 1) {
    currentStreakDays = 1;
    for (let i = days.length - 1; i > 0; i -= 1) {
      if (differenceInCalendarDays(days[i], days[i - 1]) === 1) currentStreakDays += 1; else break;
    }
  }

  const firstDay = days[0];
  const weeksElapsed = Math.max(1, differenceInCalendarWeeks(now, firstDay) + 1);
  const averageWorkoutsPerWeek = completedWorkoutDates.length / weeksElapsed;

  return { currentStreakDays, longestStreakDays, activeDays: dayKeys.length, averageWorkoutsPerWeek };
}

export function determineVolumeGrouping(from: string | null, to: string | null): VolumeTrendGrouping {
  if (!from || !to) return 'monthly';
  const days = differenceInCalendarDays(new Date(to), new Date(from));
  if (days <= 31) return 'daily';
  if (days <= 180) return 'weekly';
  return 'monthly';
}

function periodKeyAndLabel(date: Date, grouping: VolumeTrendGrouping): { key: string; start: Date; label: string } {
  if (grouping === 'daily') return { key: format(date, 'yyyy-MM-dd'), start: startOfDay(date), label: format(date, 'MMM d') };
  if (grouping === 'monthly') return { key: format(date, 'yyyy-MM'), start: startOfMonth(date), label: format(date, 'MMM yyyy') };
  const start = startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
  return { key: format(start, 'yyyy-MM-dd'), start, label: format(start, 'MMM d') };
}

/** Buckets already-sorted (ascending) items into chronological day/week/month periods. */
function groupByPeriod<T>(items: T[], grouping: VolumeTrendGrouping, dateOf: (item: T) => string, valueOf: (item: T) => number): { periodStart: string; periodLabel: string; total: number }[] {
  const buckets = new Map<string, { start: Date; label: string; total: number }>();
  for (const item of items) {
    const { key, start, label } = periodKeyAndLabel(new Date(dateOf(item)), grouping);
    const existing = buckets.get(key);
    if (existing) existing.total += valueOf(item); else buckets.set(key, { start, label, total: valueOf(item) });
  }
  return Array.from(buckets.values())
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((bucket) => ({ periodStart: bucket.start.toISOString(), periodLabel: bucket.label, total: bucket.total }));
}

export function buildWorkoutFrequencyPoints(workouts: { completedAt: string }[], grouping: VolumeTrendGrouping): WorkoutFrequencyPoint[] {
  return groupByPeriod(workouts, grouping, (item) => item.completedAt, () => 1)
    .map((bucket) => ({ periodStart: bucket.periodStart, periodLabel: bucket.periodLabel, workoutCount: bucket.total }));
}

export function buildVolumeTrendPoints(workouts: { completedAt: string; volumeKg: number }[], grouping: VolumeTrendGrouping): VolumeTrendPoint[] {
  return groupByPeriod(workouts, grouping, (item) => item.completedAt, (item) => item.volumeKg)
    .map((bucket) => ({ periodStart: bucket.periodStart, periodLabel: bucket.periodLabel, volumeKg: bucket.total }));
}

/** Per-workout aggregate for one exercise; `maxReps`/`bestSetId`/`oneRepMaxSetId` back personal-record linkage and are not all exposed on the public ExerciseProgressPoint. */
export interface ExerciseWorkoutAggregate {
  workoutId: string; completedAt: string;
  maxWeight: number | null; maxReps: number | null; maxRepsWeight: number | null;
  bestSetVolume: number | null; bestSetId: string | null;
  bestOneRepMax: number | null; oneRepMaxSetId: string | null;
  totalVolume: number; totalReps: number; completedSetCount: number;
}

const ONE_REP_MAX_MIN_REPS = 1;
const ONE_REP_MAX_MAX_REPS = 15;

/** Epley formula. Only valid in a low-to-moderate rep range where the linear estimate holds. */
export function calculateEstimatedOneRepMax(weight: number | null, reps: number | null): number | null {
  if (weight === null || weight <= 0 || reps === null || reps < ONE_REP_MAX_MIN_REPS || reps > ONE_REP_MAX_MAX_REPS) return null;
  return weight * (1 + reps / 30);
}

export function calculateSetVolume(weight: number | null, reps: number | null): number {
  return weight !== null && weight > 0 && reps !== null && reps > 0 ? weight * reps : 0;
}

/**
 * Groups flat completed-set rows (already ordered oldest-first by the repository) into one
 * aggregate per workout, preserving chronological order. Bodyweight sets (no weight) still count
 * toward reps and set totals but never toward weight/volume/1RM metrics.
 */
export function buildExerciseWorkoutAggregates(rows: ExerciseSetRow[]): ExerciseWorkoutAggregate[] {
  const order: string[] = [];
  const byWorkout = new Map<string, ExerciseWorkoutAggregate>();
  for (const row of rows) {
    let aggregate = byWorkout.get(row.workoutId);
    if (!aggregate) {
      aggregate = { workoutId: row.workoutId, completedAt: row.completedAt, maxWeight: null, maxReps: null, maxRepsWeight: null, bestSetVolume: null, bestSetId: null, bestOneRepMax: null, oneRepMaxSetId: null, totalVolume: 0, totalReps: 0, completedSetCount: 0 };
      byWorkout.set(row.workoutId, aggregate); order.push(row.workoutId);
    }
    aggregate.completedSetCount += 1;
    aggregate.totalReps += row.reps ?? 0;
    aggregate.totalVolume += calculateSetVolume(row.weight, row.reps);
    if (row.weight !== null && row.weight > 0 && (aggregate.maxWeight === null || row.weight > aggregate.maxWeight)) aggregate.maxWeight = row.weight;
    if (row.reps !== null && row.reps > 0 && (aggregate.maxReps === null || row.reps > aggregate.maxReps)) { aggregate.maxReps = row.reps; aggregate.maxRepsWeight = row.weight; }
    const setVolume = calculateSetVolume(row.weight, row.reps);
    if (setVolume > 0 && (aggregate.bestSetVolume === null || setVolume > aggregate.bestSetVolume)) { aggregate.bestSetVolume = setVolume; aggregate.bestSetId = row.setId; }
    const oneRepMax = calculateEstimatedOneRepMax(row.weight, row.reps);
    if (oneRepMax !== null && (aggregate.bestOneRepMax === null || oneRepMax > aggregate.bestOneRepMax)) { aggregate.bestOneRepMax = oneRepMax; aggregate.oneRepMaxSetId = row.setId; }
  }
  return order.map((id) => byWorkout.get(id) as ExerciseWorkoutAggregate);
}

export function toExerciseProgressPoints(aggregates: ExerciseWorkoutAggregate[]): ExerciseProgressPoint[] {
  return aggregates.map((item) => ({
    workoutId: item.workoutId, workoutDate: item.completedAt, maxWeightKg: item.maxWeight,
    bestSetVolumeKg: item.bestSetVolume, estimatedOneRepMaxKg: item.bestOneRepMax,
    totalVolumeKg: item.totalVolume, totalRepetitions: item.totalReps, completedSetCount: item.completedSetCount,
  }));
}

/** True when nothing in this exercise's history ever recorded added weight. */
export function isBodyweightHistory(aggregates: ExerciseWorkoutAggregate[]): boolean {
  return aggregates.length > 0 && aggregates.every((item) => item.maxWeight === null);
}

export function buildExerciseProgressSummary(exerciseId: string, exerciseName: string, aggregates: ExerciseWorkoutAggregate[]): ExerciseProgressSummary {
  const weights = aggregates.map((item) => item.maxWeight).filter((value): value is number => value !== null);
  const reps = aggregates.map((item) => item.maxReps).filter((value): value is number => value !== null);
  const setVolumes = aggregates.map((item) => item.bestSetVolume).filter((value): value is number => value !== null);
  const oneRepMaxes = aggregates.map((item) => item.bestOneRepMax).filter((value): value is number => value !== null);
  const workoutVolumes = aggregates.map((item) => item.totalVolume).filter((value) => value > 0);
  return {
    exerciseId, exerciseName, isBodyweight: isBodyweightHistory(aggregates), totalSessions: aggregates.length,
    firstWorkoutDate: aggregates[0]?.completedAt ?? null, lastWorkoutDate: aggregates[aggregates.length - 1]?.completedAt ?? null,
    bestWeightKg: weights.length ? Math.max(...weights) : null, bestReps: reps.length ? Math.max(...reps) : null,
    bestSetVolumeKg: setVolumes.length ? Math.max(...setVolumes) : null,
    bestWorkoutVolumeKg: workoutVolumes.length ? Math.max(...workoutVolumes) : null,
    bestEstimatedOneRepMaxKg: oneRepMaxes.length ? Math.max(...oneRepMaxes) : null,
  };
}

export function selectChartValue(point: ExerciseProgressPoint, metric: ProgressChartMetric): number | null {
  if (metric === 'maxWeight') return point.maxWeightKg;
  if (metric === 'estimatedOneRepMax') return point.estimatedOneRepMaxKg;
  if (metric === 'bestSetVolume') return point.bestSetVolumeKg;
  if (metric === 'totalVolume') return point.totalVolumeKg;
  return point.totalRepetitions;
}

export function formatDurationMinutes(seconds: number): string { return `${Math.round(seconds / 60)} min`; }
/** Weight/volume are stored and displayed in kilograms; see DECISIONS.md #9 for the Phase 5 convention. */
export function formatWeightKg(value: number | null): string { return value === null ? '—' : `${value.toFixed(1)} kg`; }
export function formatVolumeKg(value: number): string { return `${value.toFixed(1)} kg`; }
