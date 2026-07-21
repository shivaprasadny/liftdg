import type { ExerciseCategory } from '@/constants/exerciseCategories';

export const statisticsDatePresets = ['week', 'month', '30d', '3m', '6m', 'year', 'all', 'custom'] as const;
export type StatisticsDatePreset = (typeof statisticsDatePresets)[number];

/**
 * Local-day boundaries as ISO instants (never bare UTC dates) so filtering never drifts by a day
 * across timezones. `from`/`to` are null for the "all time" preset. `previousFrom`/`previousTo`
 * are null when there is no equal-length prior period to compare against (e.g. "all time").
 */
export interface StatisticsDateRange {
  preset: StatisticsDatePreset;
  from: string | null;
  to: string | null;
  previousFrom: string | null;
  previousTo: string | null;
}

export interface ProgressFilter {
  dateRange: StatisticsDateRange;
}

export interface TrainingOverview {
  totalWorkouts: number;
  strengthWorkouts: number;
  totalDurationSeconds: number;
  completedSets: number;
  totalRepetitions: number;
  totalVolumeKg: number;
  averageWorkoutDurationSeconds: number;
  personalRecordCount: number;
}

/** `previous`/`percentChange` are null when there isn't enough prior-period data to compare fairly. */
export interface ComparisonValue {
  current: number;
  previous: number | null;
  percentChange: number | null;
}

export interface StatisticsSummary {
  dateRange: StatisticsDateRange;
  overview: TrainingOverview;
  comparison: {
    totalWorkouts: ComparisonValue;
    totalVolumeKg: ComparisonValue;
    averageWorkoutDurationSeconds: ComparisonValue;
  };
  streak: StreakSummary;
}

export interface WorkoutFrequencyPoint { periodStart: string; periodLabel: string; workoutCount: number; }
export interface VolumeTrendPoint { periodStart: string; periodLabel: string; volumeKg: number; }
export type VolumeTrendGrouping = 'daily' | 'weekly' | 'monthly';

/** A "workout day" is a local calendar day with at least one completed workout. See DECISIONS.md. */
export interface StreakSummary {
  currentStreakDays: number;
  longestStreakDays: number;
  activeDays: number;
  averageWorkoutsPerWeek: number;
}

export interface ExerciseProgressSummary {
  exerciseId: string;
  exerciseName: string;
  isBodyweight: boolean;
  totalSessions: number;
  firstWorkoutDate: string | null;
  lastWorkoutDate: string | null;
  bestWeightKg: number | null;
  bestReps: number | null;
  bestSetVolumeKg: number | null;
  bestWorkoutVolumeKg: number | null;
  bestEstimatedOneRepMaxKg: number | null;
}

/** One point per completed workout containing the exercise, sorted chronologically. */
export interface ExerciseProgressPoint {
  workoutId: string;
  workoutDate: string;
  maxWeightKg: number | null;
  bestSetVolumeKg: number | null;
  estimatedOneRepMaxKg: number | null;
  totalVolumeKg: number;
  totalRepetitions: number;
  completedSetCount: number;
}

export const progressChartMetrics = [
  'maxWeight', 'estimatedOneRepMax', 'bestSetVolume', 'totalVolume', 'totalReps',
] as const;
export type ProgressChartMetric = (typeof progressChartMetrics)[number];

export type MostTrainedRankingMetric = 'sessions' | 'sets' | 'volume';
export interface MostTrainedExercise {
  exerciseId: string;
  exerciseName: string;
  sessionCount: number;
  completedSetCount: number;
  totalVolumeKg: number;
}

/**
 * Distribution by the exercise's single primary category. Exercises with multiple muscles are
 * counted once under their primary category only, so totals never double-count a set.
 */
export interface MuscleGroupSummary {
  category: ExerciseCategory;
  completedSetCount: number;
  sessionCount: number;
  totalVolumeKg: number;
}
