import { describe, expect, it } from 'vitest';

import {
  buildComparison, buildExerciseProgressSummary, buildExerciseWorkoutAggregates,
  buildVolumeTrendPoints, buildWorkoutFrequencyPoints, calculateEstimatedOneRepMax,
  calculatePercentChange, calculateSetVolume, calculateStreaks, determineVolumeGrouping,
  formatVolumeKg, formatWeightKg, getStatisticsDateRange, isBodyweightHistory, selectChartValue,
  toExerciseProgressPoints,
} from './statisticsService';
import type { ExerciseSetRow } from '@/repositories/statisticsRepository';

describe('calculateSetVolume', () => {
  it('multiplies weight by reps for a qualifying set', () => expect(calculateSetVolume(100, 5)).toBe(500));
  it('is zero when weight is not positive', () => expect(calculateSetVolume(0, 5)).toBe(0));
  it('is zero when reps is not positive', () => expect(calculateSetVolume(100, 0)).toBe(0));
  it('is zero when either value is null', () => { expect(calculateSetVolume(null, 5)).toBe(0); expect(calculateSetVolume(100, null)).toBe(0); });
});

describe('calculateEstimatedOneRepMax (Epley)', () => {
  it('matches the Epley formula for a valid set', () => expect(calculateEstimatedOneRepMax(100, 10)).toBeCloseTo(100 * (1 + 10 / 30)));
  it('is null when weight is not positive', () => expect(calculateEstimatedOneRepMax(0, 5)).toBeNull());
  it('is null below the supported rep range', () => expect(calculateEstimatedOneRepMax(100, 0)).toBeNull());
  it('is null above the supported rep range', () => expect(calculateEstimatedOneRepMax(100, 16)).toBeNull());
  it('accepts the boundary rep counts', () => {
    expect(calculateEstimatedOneRepMax(100, 1)).not.toBeNull();
    expect(calculateEstimatedOneRepMax(100, 15)).not.toBeNull();
  });
  it('is null when weight or reps is null', () => { expect(calculateEstimatedOneRepMax(null, 5)).toBeNull(); expect(calculateEstimatedOneRepMax(100, null)).toBeNull(); });
});

describe('calculatePercentChange / buildComparison', () => {
  it('computes a rounded whole-number percent change', () => expect(calculatePercentChange(112, 100)).toBe(12));
  it('is null with no previous data (hides misleading comparisons)', () => expect(calculatePercentChange(10, null)).toBeNull());
  it('is null when the previous value is zero (division by zero)', () => expect(calculatePercentChange(10, 0)).toBeNull());
  it('buildComparison carries current/previous/percentChange together', () => {
    expect(buildComparison(120, 100)).toEqual({ current: 120, previous: 100, percentChange: 20 });
  });
});

describe('getStatisticsDateRange', () => {
  const now = new Date('2026-07-20T12:00:00.000Z');

  it('returns null bounds for "all time"', () => {
    const range = getStatisticsDateRange('all', now);
    expect(range).toEqual({ preset: 'all', from: null, to: null, previousFrom: null, previousTo: null });
  });

  it('computes an equal-length previous period immediately before the current one', () => {
    const range = getStatisticsDateRange('30d', now);
    const durationMs = new Date(range.to as string).getTime() - new Date(range.from as string).getTime();
    const previousDurationMs = new Date(range.previousTo as string).getTime() - new Date(range.previousFrom as string).getTime();
    expect(previousDurationMs).toBeCloseTo(durationMs, -2);
    expect(new Date(range.previousTo as string).getTime()).toBeLessThan(new Date(range.from as string).getTime());
  });

  it('rejects an inverted custom range', () => {
    expect(() => getStatisticsDateRange('custom', now, { from: '2026-07-20', to: '2026-01-01' })).toThrow();
  });

  it('accepts a valid custom range', () => {
    const range = getStatisticsDateRange('custom', now, { from: '2026-01-01', to: '2026-01-31' });
    expect(range.from).toBeTruthy();
    expect(range.to).toBeTruthy();
  });
});

describe('calculateStreaks', () => {
  it('is all zero with no workout history', () => {
    expect(calculateStreaks([])).toEqual({ currentStreakDays: 0, longestStreakDays: 0, activeDays: 0, averageWorkoutsPerWeek: 0 });
  });

  it('counts a daily streak ending today as current', () => {
    const now = new Date('2026-07-20T18:00:00');
    const dates = ['2026-07-18T09:00:00', '2026-07-19T09:00:00', '2026-07-20T09:00:00'];
    const streak = calculateStreaks(dates, now);
    expect(streak.currentStreakDays).toBe(3);
    expect(streak.longestStreakDays).toBe(3);
    expect(streak.activeDays).toBe(3);
  });

  it('keeps a streak alive through today even without a workout logged yet', () => {
    const now = new Date('2026-07-20T08:00:00');
    const dates = ['2026-07-18T09:00:00', '2026-07-19T09:00:00'];
    expect(calculateStreaks(dates, now).currentStreakDays).toBe(2);
  });

  it('resets current streak to zero after a skipped day, but preserves the longest streak', () => {
    const now = new Date('2026-07-20T08:00:00');
    const dates = ['2026-07-01T09:00:00', '2026-07-02T09:00:00', '2026-07-03T09:00:00', '2026-07-17T09:00:00'];
    const streak = calculateStreaks(dates, now);
    expect(streak.currentStreakDays).toBe(0);
    expect(streak.longestStreakDays).toBe(3);
  });

  it('computes a weekly workout average from total workouts over elapsed weeks', () => {
    const now = new Date('2026-07-20T08:00:00');
    const dates = ['2026-07-01T09:00:00', '2026-07-08T09:00:00', '2026-07-15T09:00:00'];
    const streak = calculateStreaks(dates, now);
    expect(streak.averageWorkoutsPerWeek).toBeGreaterThan(0);
    expect(streak.averageWorkoutsPerWeek).toBeLessThanOrEqual(3);
  });

  it('counts multiple same-day workouts once toward active days', () => {
    const now = new Date('2026-07-20T08:00:00');
    const streak = calculateStreaks(['2026-07-20T09:00:00', '2026-07-20T17:00:00'], now);
    expect(streak.activeDays).toBe(1);
  });
});

describe('weight/volume display formatting (Phase 5 stores and displays kg only; see DECISIONS.md)', () => {
  it('formats a weight value in kilograms with one decimal', () => expect(formatWeightKg(102.5)).toBe('102.5 kg'));
  it('formats a missing weight as an em dash rather than 0', () => expect(formatWeightKg(null)).toBe('—'));
  it('formats a volume value in kilograms with one decimal', () => expect(formatVolumeKg(1234.5)).toBe('1234.5 kg'));
});

describe('determineVolumeGrouping', () => {
  it('groups short ranges daily', () => expect(determineVolumeGrouping('2026-07-01', '2026-07-20')).toBe('daily'));
  it('groups medium ranges weekly', () => expect(determineVolumeGrouping('2026-04-01', '2026-07-20')).toBe('weekly'));
  it('groups long ranges monthly', () => expect(determineVolumeGrouping('2024-01-01', '2026-07-20')).toBe('monthly'));
  it('falls back to monthly for an unbounded ("all time") range', () => expect(determineVolumeGrouping(null, null)).toBe('monthly'));
});

describe('chart grouping', () => {
  it('buckets workouts into daily frequency points', () => {
    const points = buildWorkoutFrequencyPoints([
      { completedAt: '2026-07-01T09:00:00Z' }, { completedAt: '2026-07-01T18:00:00Z' }, { completedAt: '2026-07-02T09:00:00Z' },
    ], 'daily');
    expect(points).toHaveLength(2);
    expect(points[0].workoutCount).toBe(2);
    expect(points[1].workoutCount).toBe(1);
  });

  it('sums volume within each monthly bucket in chronological order', () => {
    // Noon UTC keeps each fixture on the same calendar day across realistic local timezones.
    const points = buildVolumeTrendPoints([
      { completedAt: '2026-01-05T12:00:00Z', volumeKg: 100 }, { completedAt: '2026-01-20T12:00:00Z', volumeKg: 50 },
      { completedAt: '2026-02-01T12:00:00Z', volumeKg: 75 },
    ], 'monthly');
    expect(points).toHaveLength(2);
    expect(points[0].volumeKg).toBe(150);
    expect(points[1].volumeKg).toBe(75);
    expect(new Date(points[0].periodStart).getTime()).toBeLessThan(new Date(points[1].periodStart).getTime());
  });
});

function set(workoutId: string, completedAt: string, setId: string, weight: number | null, reps: number | null): ExerciseSetRow {
  return { workoutId, completedAt, setId, weight, reps };
}

describe('buildExerciseWorkoutAggregates / exercise progress', () => {
  it('aggregates max weight, best set volume, best 1RM, and totals per workout', () => {
    const rows = [
      set('w1', '2026-01-01T00:00:00Z', 's1', 100, 5),
      set('w1', '2026-01-01T00:00:00Z', 's2', 110, 3),
      set('w2', '2026-02-01T00:00:00Z', 's3', 120, 8),
    ];
    const aggregates = buildExerciseWorkoutAggregates(rows);
    expect(aggregates).toHaveLength(2);
    expect(aggregates[0].maxWeight).toBe(110);
    expect(aggregates[0].totalVolume).toBe(100 * 5 + 110 * 3);
    expect(aggregates[0].completedSetCount).toBe(2);
    expect(aggregates[1].maxWeight).toBe(120);
  });

  it('handles bodyweight sets (null weight) without producing weight-based metrics', () => {
    const rows = [set('w1', '2026-01-01T00:00:00Z', 's1', null, 12), set('w1', '2026-01-01T00:00:00Z', 's2', null, 10)];
    const aggregates = buildExerciseWorkoutAggregates(rows);
    expect(aggregates[0].maxWeight).toBeNull();
    expect(aggregates[0].bestSetVolume).toBeNull();
    expect(aggregates[0].bestOneRepMax).toBeNull();
    expect(aggregates[0].maxReps).toBe(12);
    expect(isBodyweightHistory(aggregates)).toBe(true);
  });

  it('is not classified as bodyweight once any set has added weight', () => {
    const rows = [set('w1', '2026-01-01T00:00:00Z', 's1', null, 12), set('w2', '2026-02-01T00:00:00Z', 's2', 20, 8)];
    expect(isBodyweightHistory(buildExerciseWorkoutAggregates(rows))).toBe(false);
  });

  it('maps aggregates to chronological, publicly-shaped progress points', () => {
    const rows = [set('w1', '2026-01-01T00:00:00Z', 's1', 100, 5), set('w2', '2026-02-01T00:00:00Z', 's2', 105, 5)];
    const points = toExerciseProgressPoints(buildExerciseWorkoutAggregates(rows));
    expect(points.map((point) => point.workoutId)).toEqual(['w1', 'w2']);
    expect(selectChartValue(points[1], 'maxWeight')).toBe(105);
    expect(selectChartValue(points[1], 'totalReps')).toBe(5);
  });

  it('derives an exercise progress summary with all-time bests', () => {
    const rows = [set('w1', '2026-01-01T00:00:00Z', 's1', 100, 5), set('w2', '2026-02-01T00:00:00Z', 's2', 120, 3)];
    const summary = buildExerciseProgressSummary('ex1', 'Bench Press', buildExerciseWorkoutAggregates(rows));
    expect(summary.totalSessions).toBe(2);
    expect(summary.bestWeightKg).toBe(120);
    expect(summary.firstWorkoutDate).toBe('2026-01-01T00:00:00Z');
    expect(summary.lastWorkoutDate).toBe('2026-02-01T00:00:00Z');
  });
});
