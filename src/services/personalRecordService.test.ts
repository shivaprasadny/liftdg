import type { SQLiteDatabase } from 'expo-sqlite';
import { describe, expect, it, vi } from 'vitest';

import { PERSONAL_RECORD_BACKFILL_VERSION } from '@/database/schema';
import type { ExerciseWorkoutAggregate } from '@/services/statisticsService';

import {
  backfillPersonalRecords, buildCandidatesForWorkout, getExerciseRecordsWithDelta, recalculateExerciseRecords,
} from './personalRecordService';

function aggregate(overrides: Partial<ExerciseWorkoutAggregate>): ExerciseWorkoutAggregate {
  return {
    workoutId: 'w1', completedAt: '2026-01-01T00:00:00Z', maxWeight: null, maxReps: null, maxRepsWeight: null,
    bestSetVolume: null, bestSetId: null, bestOneRepMax: null, oneRepMaxSetId: null,
    totalVolume: 0, totalReps: 0, completedSetCount: 0, ...overrides,
  };
}

describe('buildCandidatesForWorkout', () => {
  it('only produces a candidate for record types the workout actually qualifies for', () => {
    const candidates = buildCandidatesForWorkout('ex1', aggregate({ maxWeight: 100, maxReps: 8, maxRepsWeight: 60, totalVolume: 500 }));
    const types = candidates.map((candidate) => candidate.recordType).sort();
    expect(types).toEqual(['best_workout_volume', 'max_reps', 'max_weight']);
    const maxReps = candidates.find((candidate) => candidate.recordType === 'max_reps');
    expect(maxReps?.secondaryValue).toBe(60);
  });

  it('produces no candidates for a workout with no qualifying values', () => {
    expect(buildCandidatesForWorkout('ex1', aggregate({}))).toEqual([]);
  });

  it('links best_set_volume and estimated_one_rep_max to their originating set', () => {
    const candidates = buildCandidatesForWorkout('ex1', aggregate({ bestSetVolume: 550, bestSetId: 'set-a', bestOneRepMax: 133, oneRepMaxSetId: 'set-b' }));
    expect(candidates.find((candidate) => candidate.recordType === 'best_set_volume')?.workoutSetId).toBe('set-a');
    expect(candidates.find((candidate) => candidate.recordType === 'estimated_one_rep_max')?.workoutSetId).toBe('set-b');
  });
});

/** A minimal in-memory fake covering just the calls personalRecordService makes. */
function createFakeDb(setRows: { workout_id: string; completed_at: string; set_id: string; weight: number | null; reps: number | null }[]) {
  const inserted: { exercise_id: string; workout_id: string; record_type: string; value: number }[] = [];
  const deletedForExercise: string[] = [];
  const transaction = {
    runAsync: vi.fn(async (sql: string, params: unknown[] = []) => {
      if (sql.startsWith('DELETE FROM personal_records WHERE exercise_id')) deletedForExercise.push(params[0] as string);
      if (sql.startsWith('INSERT INTO personal_records')) {
        inserted.push({ exercise_id: params[1] as string, workout_id: params[2] as string, record_type: params[4] as string, value: params[5] as number });
      }
      return { changes: 1, lastInsertRowId: 0 };
    }),
  };
  const db = {
    getAllAsync: vi.fn(async () => setRows),
    withExclusiveTransactionAsync: async (callback: (value: SQLiteDatabase) => Promise<void>) => callback(transaction as unknown as SQLiteDatabase),
  } as unknown as SQLiteDatabase;
  return { db, inserted, deletedForExercise };
}

describe('recalculateExerciseRecords', () => {
  it('inserts a new max_weight record only when a later workout beats the running best', async () => {
    const { db, inserted, deletedForExercise } = createFakeDb([
      { workout_id: 'w1', completed_at: '2026-01-01T00:00:00Z', set_id: 's1', weight: 100, reps: 5 },
      { workout_id: 'w2', completed_at: '2026-02-01T00:00:00Z', set_id: 's2', weight: 90, reps: 5 },
      { workout_id: 'w3', completed_at: '2026-03-01T00:00:00Z', set_id: 's3', weight: 110, reps: 5 },
    ]);

    await recalculateExerciseRecords(db, 'ex1');

    expect(deletedForExercise).toEqual(['ex1']);
    const maxWeightInserts = inserted.filter((row) => row.record_type === 'max_weight');
    expect(maxWeightInserts.map((row) => row.workout_id)).toEqual(['w1', 'w3']);
    expect(maxWeightInserts.map((row) => row.value)).toEqual([100, 110]);
  });

  it('never inserts two records for the same type and value (a tie is not a new best)', async () => {
    const { db, inserted } = createFakeDb([
      { workout_id: 'w1', completed_at: '2026-01-01T00:00:00Z', set_id: 's1', weight: 100, reps: 5 },
      { workout_id: 'w2', completed_at: '2026-02-01T00:00:00Z', set_id: 's2', weight: 100, reps: 5 },
    ]);

    await recalculateExerciseRecords(db, 'ex1');

    expect(inserted.filter((row) => row.record_type === 'max_weight')).toHaveLength(1);
  });

  it('recalculates correctly after a workout is removed from history (edit/delete simulation)', async () => {
    // Full history: the second workout set the max_weight record.
    const withBoth = createFakeDb([
      { workout_id: 'w1', completed_at: '2026-01-01T00:00:00Z', set_id: 's1', weight: 100, reps: 5 },
      { workout_id: 'w2', completed_at: '2026-02-01T00:00:00Z', set_id: 's2', weight: 120, reps: 5 },
    ]);
    await recalculateExerciseRecords(withBoth.db, 'ex1');
    expect(withBoth.inserted.filter((row) => row.record_type === 'max_weight').map((row) => row.workout_id)).toEqual(['w1', 'w2']);

    // After w2 is deleted/edited away, recalculating from the remaining history should restore w1 as the best.
    const afterRemoval = createFakeDb([{ workout_id: 'w1', completed_at: '2026-01-01T00:00:00Z', set_id: 's1', weight: 100, reps: 5 }]);
    await recalculateExerciseRecords(afterRemoval.db, 'ex1');
    const maxWeightAfter = afterRemoval.inserted.filter((row) => row.record_type === 'max_weight');
    expect(maxWeightAfter).toHaveLength(1);
    expect(maxWeightAfter[0].workout_id).toBe('w1');
  });
});

describe('getExerciseRecordsWithDelta', () => {
  it('annotates each record with the value of the record it superseded', async () => {
    const db = {
      getAllAsync: vi.fn(async () => [
        { id: 'r2', exercise_id: 'ex1', exercise_name: 'Bench', workout_id: 'w2', workout_set_id: null, record_type: 'max_weight', value: 120, secondary_value: null, achieved_at: '2026-02-01T00:00:00Z', created_at: '2026-02-01T00:00:00Z', updated_at: '2026-02-01T00:00:00Z' },
        { id: 'r1', exercise_id: 'ex1', exercise_name: 'Bench', workout_id: 'w1', workout_set_id: null, record_type: 'max_weight', value: 100, secondary_value: null, achieved_at: '2026-01-01T00:00:00Z', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
      ]),
    } as unknown as SQLiteDatabase;

    const records = await getExerciseRecordsWithDelta(db, 'ex1');
    expect(records.find((record) => record.id === 'r1')?.previousValue).toBeNull();
    expect(records.find((record) => record.id === 'r2')?.previousValue).toBe(100);
  });
});

describe('backfillPersonalRecords', () => {
  it('does nothing when the backfill marker is already current', async () => {
    const recalcQueries = vi.fn(async () => []);
    const db = {
      getFirstAsync: vi.fn(async () => ({ value: String(PERSONAL_RECORD_BACKFILL_VERSION) })),
      getAllAsync: recalcQueries,
      runAsync: vi.fn(),
    } as unknown as SQLiteDatabase;

    await backfillPersonalRecords(db);

    expect(recalcQueries).not.toHaveBeenCalled();
  });

  it('recalculates every trained exercise once and writes the version marker when not yet backfilled', async () => {
    const runAsync = vi.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const db = {
      getFirstAsync: vi.fn(async () => null),
      getAllAsync: vi.fn(async (sql: string) => {
        if (sql.includes('DISTINCT we.exercise_id')) return [{ exercise_id: 'ex1' }, { exercise_id: 'ex2' }];
        return [];
      }),
      runAsync,
      withExclusiveTransactionAsync: async (callback: (value: SQLiteDatabase) => Promise<void>) => callback({ runAsync } as unknown as SQLiteDatabase),
    } as unknown as SQLiteDatabase;

    await backfillPersonalRecords(db);

    expect(runAsync).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO app_settings'), expect.arrayContaining([String(PERSONAL_RECORD_BACKFILL_VERSION)]));
  });

  it('is safe to run again after completing (idempotent)', async () => {
    const runAsync = vi.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const db = {
      getFirstAsync: vi.fn(async () => ({ value: String(PERSONAL_RECORD_BACKFILL_VERSION) })),
      getAllAsync: vi.fn(async () => []),
      runAsync,
    } as unknown as SQLiteDatabase;

    await backfillPersonalRecords(db);
    await backfillPersonalRecords(db);

    expect(runAsync).not.toHaveBeenCalled();
  });
});
