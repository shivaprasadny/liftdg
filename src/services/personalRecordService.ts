import type { SQLiteDatabase } from 'expo-sqlite';

import {
  deleteRecordsForExercise, getRecordsForExercise, insertPersonalRecord,
} from '@/repositories/personalRecordRepository';
import { getExerciseProgress } from '@/repositories/statisticsRepository';
import { PERSONAL_RECORD_BACKFILL_VERSION } from '@/database/schema';
import { buildExerciseWorkoutAggregates, type ExerciseWorkoutAggregate } from '@/services/statisticsService';
import type { PersonalRecordCandidate, PersonalRecordType, PersonalRecordWithDelta } from '@/types/personalRecord';

/** One candidate per record type the workout actually qualifies for; types are always independent. */
export function buildCandidatesForWorkout(exerciseId: string, workout: ExerciseWorkoutAggregate): PersonalRecordCandidate[] {
  const candidates: PersonalRecordCandidate[] = [];
  const base = { exerciseId, workoutId: workout.workoutId, achievedAt: workout.completedAt };
  if (workout.maxWeight !== null) {
    candidates.push({ ...base, workoutSetId: null, recordType: 'max_weight', value: workout.maxWeight, secondaryValue: null });
  }
  if (workout.maxReps !== null) {
    candidates.push({ ...base, workoutSetId: null, recordType: 'max_reps', value: workout.maxReps, secondaryValue: workout.maxRepsWeight });
  }
  if (workout.bestSetVolume !== null) {
    candidates.push({ ...base, workoutSetId: workout.bestSetId, recordType: 'best_set_volume', value: workout.bestSetVolume, secondaryValue: null });
  }
  if (workout.bestOneRepMax !== null) {
    candidates.push({ ...base, workoutSetId: workout.oneRepMaxSetId, recordType: 'estimated_one_rep_max', value: workout.bestOneRepMax, secondaryValue: null });
  }
  if (workout.totalVolume > 0) {
    candidates.push({ ...base, workoutSetId: null, recordType: 'best_workout_volume', value: workout.totalVolume, secondaryValue: null });
  }
  return candidates;
}

const emptyRunningBests = (): Record<PersonalRecordType, number> => ({
  max_weight: -Infinity, max_reps: -Infinity, best_set_volume: -Infinity,
  estimated_one_rep_max: -Infinity, best_workout_volume: -Infinity,
});

/**
 * Replays one exercise's entire completed-workout history in chronological order, inserting a new
 * personal record every time a workout beats the running best for that record type. This keeps
 * every past best as history (never only the latest) and is fully deterministic, so it is used
 * uniformly after finishing a workout, editing/deleting a completed workout, and during backfill,
 * rather than maintaining separate incremental-update logic for each case.
 */
export async function recalculateExerciseRecords(db: SQLiteDatabase, exerciseId: string): Promise<void> {
  const rows = await getExerciseProgress(db, exerciseId);
  const workouts = buildExerciseWorkoutAggregates(rows);
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await deleteRecordsForExercise(transaction, exerciseId);
    const runningBest = emptyRunningBests();
    for (const workout of workouts) {
      for (const candidate of buildCandidatesForWorkout(exerciseId, workout)) {
        if (candidate.value > runningBest[candidate.recordType]) {
          runningBest[candidate.recordType] = candidate.value;
          await insertPersonalRecord(transaction, candidate);
        }
      }
    }
  });
}

export async function recalculateRecordsForExercises(db: SQLiteDatabase, exerciseIds: string[]): Promise<void> {
  for (const exerciseId of Array.from(new Set(exerciseIds))) await recalculateExerciseRecords(db, exerciseId);
}

/** Annotates each record with the best value it superseded, for "previous best" UI copy. */
export async function getExerciseRecordsWithDelta(db: SQLiteDatabase, exerciseId: string): Promise<PersonalRecordWithDelta[]> {
  const records = await getRecordsForExercise(db, exerciseId);
  const byType = new Map<PersonalRecordType, typeof records>();
  for (const record of records) {
    const list = byType.get(record.recordType) ?? []; list.push(record); byType.set(record.recordType, list);
  }
  const previousById = new Map<string, number | null>();
  for (const list of byType.values()) {
    const chronological = [...list].sort((a, b) => a.achievedAt.localeCompare(b.achievedAt));
    chronological.forEach((record, index) => previousById.set(record.id, index > 0 ? chronological[index - 1].value : null));
  }
  return records.map((record) => ({ ...record, previousValue: previousById.get(record.id) ?? null }));
}

const BACKFILL_VERSION_KEY = 'personal_record_backfill_version';

/**
 * One-time historical scan: replays every exercise that has completed-workout history so PRs
 * exist for data logged before Phase 5. Gated by an `app_settings` marker (same pattern as the
 * exercise/starter-plan seed versions) so it is safe to call on every launch but only does work
 * once. Runs un-awaited by the caller so it never blocks app startup; each exercise recalculates
 * in its own small transaction, yielding to the event loop between exercises.
 */
export async function backfillPersonalRecords(db: SQLiteDatabase): Promise<void> {
  const setting = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [BACKFILL_VERSION_KEY]);
  if (Number(setting?.value ?? 0) >= PERSONAL_RECORD_BACKFILL_VERSION) return;

  const rows = await db.getAllAsync<{ exercise_id: string }>(`
    SELECT DISTINCT we.exercise_id FROM workout_exercises we
    JOIN workouts w ON w.id = we.workout_id WHERE w.status = 'completed'`);
  for (const [index, row] of rows.entries()) {
    await recalculateExerciseRecords(db, row.exercise_id);
    // Yield between small batches so a large legacy history does not monopolize the JS thread.
    if ((index + 1) % 10 === 0) await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [BACKFILL_VERSION_KEY, String(PERSONAL_RECORD_BACKFILL_VERSION), now],
  );
}
