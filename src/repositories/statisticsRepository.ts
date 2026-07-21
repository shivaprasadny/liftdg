import type { SQLiteDatabase } from 'expo-sqlite';

import {
  buildComparison, buildExerciseProgressSummary, buildExerciseWorkoutAggregates,
  buildVolumeTrendPoints, buildWorkoutFrequencyPoints, calculateStreaks, determineVolumeGrouping,
  getStatisticsDateRange, toExerciseProgressPoints,
} from '@/services/statisticsService';
import type { ExerciseCategory } from '@/constants/exerciseCategories';
import type {
  ExerciseProgressPoint, ExerciseProgressSummary, MostTrainedRankingMetric, StatisticsDatePreset,
  StatisticsSummary, TrainingOverview, VolumeTrendPoint, WorkoutFrequencyPoint,
} from '@/types/statistics';

/** Inclusive bounds on `completed_at`/`achieved_at`. Either side may be null to mean unbounded. */
export interface DateBounds { from: string | null; to: string | null; }

function boundConditions(column: string, range: DateBounds, conditions: string[], params: (string | number)[]): void {
  if (range.from) { conditions.push(`${column} >= ?`); params.push(range.from); }
  if (range.to) { conditions.push(`${column} <= ?`); params.push(range.to); }
}

const completedSetJoin = `FROM workout_sets ws
  JOIN workout_exercises we ON we.id = ws.workout_exercise_id
  JOIN workouts w ON w.id = we.workout_id`;

export async function getWorkoutCount(db: SQLiteDatabase, range: DateBounds): Promise<number> {
  const conditions = ["status = 'completed'"]; const params: (string | number)[] = [];
  boundConditions('completed_at', range, conditions, params);
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM workouts WHERE ${conditions.join(' AND ')}`, params,
  );
  return row?.count ?? 0;
}

export async function getStrengthWorkoutCount(db: SQLiteDatabase, range: DateBounds): Promise<number> {
  const conditions = ["status = 'completed'", "workout_type = 'strength'"]; const params: (string | number)[] = [];
  boundConditions('completed_at', range, conditions, params);
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM workouts WHERE ${conditions.join(' AND ')}`, params,
  );
  return row?.count ?? 0;
}

export async function getTotalTrainingDuration(db: SQLiteDatabase, range: DateBounds): Promise<number> {
  const conditions = ["status = 'completed'"]; const params: (string | number)[] = [];
  boundConditions('completed_at', range, conditions, params);
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(duration_seconds), 0) AS total FROM workouts WHERE ${conditions.join(' AND ')}`, params,
  );
  return row?.total ?? 0;
}

export async function getAverageWorkoutDuration(db: SQLiteDatabase, range: DateBounds): Promise<number> {
  const conditions = ["status = 'completed'"]; const params: (string | number)[] = [];
  boundConditions('completed_at', range, conditions, params);
  const row = await db.getFirstAsync<{ average: number | null }>(
    `SELECT AVG(duration_seconds) AS average FROM workouts WHERE ${conditions.join(' AND ')}`, params,
  );
  return row?.average ?? 0;
}

export async function getTotalCompletedSets(db: SQLiteDatabase, range: DateBounds): Promise<number> {
  const conditions = ["w.status = 'completed'", 'ws.completed = 1']; const params: (string | number)[] = [];
  boundConditions('w.completed_at', range, conditions, params);
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count ${completedSetJoin} WHERE ${conditions.join(' AND ')}`, params,
  );
  return row?.count ?? 0;
}

export async function getTotalRepetitions(db: SQLiteDatabase, range: DateBounds): Promise<number> {
  const conditions = ["w.status = 'completed'", 'ws.completed = 1']; const params: (string | number)[] = [];
  boundConditions('w.completed_at', range, conditions, params);
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(ws.reps), 0) AS total ${completedSetJoin} WHERE ${conditions.join(' AND ')}`, params,
  );
  return row?.total ?? 0;
}

/** Volume only counts completed sets with positive weight and reps, matching workoutService rules. */
export async function getTotalVolume(db: SQLiteDatabase, range: DateBounds): Promise<number> {
  const conditions = ["w.status = 'completed'", 'ws.completed = 1', 'ws.weight > 0', 'ws.reps > 0'];
  const params: (string | number)[] = [];
  boundConditions('w.completed_at', range, conditions, params);
  const row = await db.getFirstAsync<{ total: number }>(
    `SELECT COALESCE(SUM(ws.weight * ws.reps), 0) AS total ${completedSetJoin} WHERE ${conditions.join(' AND ')}`, params,
  );
  return row?.total ?? 0;
}

export async function getFirstCompletedWorkoutDate(db: SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string | null }>(
    "SELECT MIN(completed_at) AS value FROM workouts WHERE status = 'completed'",
  );
  return row?.value ?? null;
}

export async function getLatestCompletedWorkoutDate(db: SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string | null }>(
    "SELECT MAX(completed_at) AS value FROM workouts WHERE status = 'completed'",
  );
  return row?.value ?? null;
}

/** One row per completed workout; grouping into day/week/month buckets happens in JS (local time). */
export async function getWorkoutFrequency(db: SQLiteDatabase, range: DateBounds): Promise<{ completedAt: string }[]> {
  const conditions = ["status = 'completed'"]; const params: (string | number)[] = [];
  boundConditions('completed_at', range, conditions, params);
  const rows = await db.getAllAsync<{ completed_at: string }>(
    `SELECT completed_at FROM workouts WHERE ${conditions.join(' AND ')} ORDER BY completed_at ASC`, params,
  );
  return rows.map((row) => ({ completedAt: row.completed_at }));
}

/** One row per completed workout with its total strength volume; grouping happens in JS. */
export async function getVolumeByPeriod(
  db: SQLiteDatabase, range: DateBounds,
): Promise<{ completedAt: string; volumeKg: number }[]> {
  const conditions = ["w.status = 'completed'"]; const params: (string | number)[] = [];
  boundConditions('w.completed_at', range, conditions, params);
  const rows = await db.getAllAsync<{ completed_at: string; volume: number }>(`
    SELECT w.completed_at,
      COALESCE(SUM(CASE WHEN ws.completed = 1 AND ws.weight > 0 AND ws.reps > 0 THEN ws.weight * ws.reps ELSE 0 END), 0) AS volume
    FROM workouts w
    LEFT JOIN workout_exercises we ON we.workout_id = w.id
    LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
    WHERE ${conditions.join(' AND ')}
    GROUP BY w.id ORDER BY w.completed_at ASC`, params);
  return rows.map((row) => ({ completedAt: row.completed_at, volumeKg: row.volume }));
}

/** Distinct exercise IDs ordered by their most recent completed session, for the progress selector. */
export async function getRecentlyTrainedExerciseIds(db: SQLiteDatabase, limit = 8): Promise<string[]> {
  const rows = await db.getAllAsync<{ exercise_id: string }>(`
    SELECT we.exercise_id AS exercise_id, MAX(w.completed_at) AS last_completed_at
    FROM workout_exercises we JOIN workouts w ON w.id = we.workout_id
    WHERE w.status = 'completed'
    GROUP BY we.exercise_id ORDER BY last_completed_at DESC LIMIT ?`, [limit]);
  return rows.map((row) => row.exercise_id);
}

export async function getExerciseSessionCount(db: SQLiteDatabase, exerciseId: string): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(`
    SELECT COUNT(DISTINCT w.id) AS count FROM workouts w
    JOIN workout_exercises we ON we.workout_id = w.id
    WHERE w.status = 'completed' AND we.exercise_id = ?`, [exerciseId]);
  return row?.count ?? 0;
}

export interface ExerciseSetRow { workoutId: string; completedAt: string; setId: string; weight: number | null; reps: number | null; }

/**
 * Every completed set for one exercise across all completed workouts, oldest first. Bounded by a
 * single exercise's history, so per-set JS aggregation (progress points and PR replay) stays cheap
 * without needing correlated subqueries to recover which set produced a given MAX(...).
 */
export async function getExerciseProgress(db: SQLiteDatabase, exerciseId: string): Promise<ExerciseSetRow[]> {
  const rows = await db.getAllAsync<{ workout_id: string; completed_at: string; set_id: string; weight: number | null; reps: number | null }>(`
    SELECT w.id AS workout_id, w.completed_at AS completed_at, ws.id AS set_id, ws.weight, ws.reps
    FROM workouts w
    JOIN workout_exercises we ON we.workout_id = w.id
    JOIN workout_sets ws ON ws.workout_exercise_id = we.id
    WHERE w.status = 'completed' AND we.exercise_id = ? AND ws.completed = 1
    ORDER BY w.completed_at ASC, ws.set_number ASC`, [exerciseId]);
  return rows.map((row) => ({ workoutId: row.workout_id, completedAt: row.completed_at, setId: row.set_id, weight: row.weight, reps: row.reps }));
}

export async function getMostTrainedExercises(
  db: SQLiteDatabase, range: DateBounds, metric: MostTrainedRankingMetric = 'sessions', limit = 10,
): Promise<{ exerciseId: string; exerciseName: string; sessionCount: number; completedSetCount: number; totalVolumeKg: number }[]> {
  const conditions = ["w.status = 'completed'"]; const params: (string | number)[] = [];
  boundConditions('w.completed_at', range, conditions, params);
  const order = metric === 'sets' ? 'completed_set_count' : metric === 'volume' ? 'total_volume' : 'session_count';
  const rows = await db.getAllAsync<{ exercise_id: string; exercise_name: string; session_count: number; completed_set_count: number; total_volume: number }>(`
    SELECT e.id AS exercise_id, e.name AS exercise_name,
      COUNT(DISTINCT w.id) AS session_count,
      COALESCE(SUM(CASE WHEN ws.completed = 1 THEN 1 ELSE 0 END), 0) AS completed_set_count,
      COALESCE(SUM(CASE WHEN ws.completed = 1 AND ws.weight > 0 AND ws.reps > 0 THEN ws.weight * ws.reps ELSE 0 END), 0) AS total_volume
    FROM exercises e
    JOIN workout_exercises we ON we.exercise_id = e.id
    JOIN workouts w ON w.id = we.workout_id
    LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
    WHERE ${conditions.join(' AND ')}
    GROUP BY e.id ORDER BY ${order} DESC LIMIT ?`, [...params, limit]);
  return rows.map((row) => ({ exerciseId: row.exercise_id, exerciseName: row.exercise_name, sessionCount: row.session_count, completedSetCount: row.completed_set_count, totalVolumeKg: row.total_volume }));
}

/** Grouped by each exercise's single primary category, so a set is never counted in two groups. */
export async function getMuscleGroupDistribution(
  db: SQLiteDatabase, range: DateBounds,
): Promise<{ category: ExerciseCategory; completedSetCount: number; sessionCount: number; totalVolumeKg: number }[]> {
  const conditions = ["w.status = 'completed'"]; const params: (string | number)[] = [];
  boundConditions('w.completed_at', range, conditions, params);
  const rows = await db.getAllAsync<{ category: ExerciseCategory; completed_set_count: number; session_count: number; total_volume: number }>(`
    SELECT e.category AS category,
      COALESCE(SUM(CASE WHEN ws.completed = 1 THEN 1 ELSE 0 END), 0) AS completed_set_count,
      COUNT(DISTINCT w.id) AS session_count,
      COALESCE(SUM(CASE WHEN ws.completed = 1 AND ws.weight > 0 AND ws.reps > 0 THEN ws.weight * ws.reps ELSE 0 END), 0) AS total_volume
    FROM exercises e
    JOIN workout_exercises we ON we.exercise_id = e.id
    JOIN workouts w ON w.id = we.workout_id
    LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id
    WHERE ${conditions.join(' AND ')}
    GROUP BY e.category ORDER BY total_volume DESC`, params);
  return rows.map((row) => ({ category: row.category, completedSetCount: row.completed_set_count, sessionCount: row.session_count, totalVolumeKg: row.total_volume }));
}

export async function getTrainingOverview(db: SQLiteDatabase, range: DateBounds): Promise<TrainingOverview> {
  const prConditions: string[] = []; const prParams: (string | number)[] = [];
  boundConditions('achieved_at', range, prConditions, prParams);
  const prWhere = prConditions.length ? `WHERE ${prConditions.join(' AND ')}` : '';
  const [totalWorkouts, strengthWorkouts, totalDurationSeconds, completedSets, totalRepetitions, totalVolumeKg, averageWorkoutDurationSeconds, prCount] = await Promise.all([
    getWorkoutCount(db, range), getStrengthWorkoutCount(db, range), getTotalTrainingDuration(db, range),
    getTotalCompletedSets(db, range), getTotalRepetitions(db, range), getTotalVolume(db, range),
    getAverageWorkoutDuration(db, range),
    db.getFirstAsync<{ count: number }>(`SELECT COUNT(*) AS count FROM personal_records ${prWhere}`, prParams),
  ]);
  return {
    totalWorkouts, strengthWorkouts, totalDurationSeconds, completedSets, totalRepetitions, totalVolumeKg,
    averageWorkoutDurationSeconds, personalRecordCount: prCount?.count ?? 0,
  };
}

/**
 * The full Progress-tab overview: current vs. previous-period totals and comparisons. Streaks
 * intentionally scan all-time workout dates regardless of the selected range (see DECISIONS.md),
 * so a "This Month" filter never resets a streak that is still active.
 */
export async function getStatisticsSummary(
  db: SQLiteDatabase, preset: StatisticsDatePreset, custom?: { from: string; to: string },
): Promise<StatisticsSummary> {
  const dateRange = getStatisticsDateRange(preset, new Date(), custom);
  const [overview, previousOverview, allWorkoutDates] = await Promise.all([
    getTrainingOverview(db, { from: dateRange.from, to: dateRange.to }),
    dateRange.previousFrom
      ? getTrainingOverview(db, { from: dateRange.previousFrom, to: dateRange.previousTo })
      : null,
    getWorkoutFrequency(db, { from: null, to: null }),
  ]);
  const streak = calculateStreaks(allWorkoutDates.map((item) => item.completedAt));
  return {
    dateRange, overview,
    comparison: {
      totalWorkouts: buildComparison(overview.totalWorkouts, previousOverview?.totalWorkouts ?? null),
      totalVolumeKg: buildComparison(overview.totalVolumeKg, previousOverview?.totalVolumeKg ?? null),
      averageWorkoutDurationSeconds: buildComparison(overview.averageWorkoutDurationSeconds, previousOverview?.averageWorkoutDurationSeconds ?? null),
    },
    streak,
  };
}

export async function getWorkoutFrequencyChart(db: SQLiteDatabase, range: DateBounds): Promise<WorkoutFrequencyPoint[]> {
  const workouts = await getWorkoutFrequency(db, range);
  return buildWorkoutFrequencyPoints(workouts, determineVolumeGrouping(range.from, range.to));
}

export async function getVolumeTrendChart(db: SQLiteDatabase, range: DateBounds): Promise<VolumeTrendPoint[]> {
  const workouts = await getVolumeByPeriod(db, range);
  return buildVolumeTrendPoints(workouts, determineVolumeGrouping(range.from, range.to));
}

/** Full progress view for one exercise: summary bests plus a chronological chart-ready series. */
export async function getExerciseProgressDetail(
  db: SQLiteDatabase, exerciseId: string, exerciseName: string,
): Promise<{ summary: ExerciseProgressSummary; points: ExerciseProgressPoint[] }> {
  const rows = await getExerciseProgress(db, exerciseId);
  const aggregates = buildExerciseWorkoutAggregates(rows);
  return { summary: buildExerciseProgressSummary(exerciseId, exerciseName, aggregates), points: toExerciseProgressPoints(aggregates) };
}
