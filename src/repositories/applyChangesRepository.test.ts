import type { SQLiteDatabase } from 'expo-sqlite';
import { describe, expect, it, vi } from 'vitest';

import type { WorkoutDetails } from '@/types/workout';

import { applyReplacementsToPlan, getReplacedExerciseChanges } from './applyChangesRepository';
import { getExerciseById } from './exerciseRepository';
import { getPlanById } from './workoutPlanRepository';

vi.mock('./workoutPlanRepository', () => ({ getPlanById: vi.fn() }));
vi.mock('./exerciseRepository', () => ({ getExerciseById: vi.fn() }));

const exercise = (id: string, name: string) => ({ id, name, category: 'Chest', primaryMuscles: [], secondaryMuscles: [], equipment: 'Barbell', exerciseType: 'strength', instructions: [], isBuiltin: true, isArchived: false, createdAt: '', updatedAt: '' });

function workoutWith(exercises: Partial<WorkoutDetails['exercises'][number]>[]): WorkoutDetails {
  return { id: 'w', planId: 'plan-1', planName: 'Push Day', name: 'Push Day', workoutType: 'strength', startedAt: '', completedAt: '', durationSeconds: 0,
    notes: null, status: 'completed', createdAt: '', updatedAt: '', cardioSessions: [], groups: [],
    summary: { exerciseCount: 0, completedExerciseCount: 0, completedSetCount: 0, totalRepetitions: 0, totalVolume: 0, averageRpe: null, durationSeconds: 0 },
    exercises: exercises as WorkoutDetails['exercises'] } as unknown as WorkoutDetails;
}

describe('getReplacedExerciseChanges', () => {
  it('returns nothing when the workout has no linked plan', async () => {
    const db = {} as SQLiteDatabase;
    expect(await getReplacedExerciseChanges(db, workoutWith([]))).toEqual([]);
  });

  it('returns nothing when the linked plan is built-in', async () => {
    vi.mocked(getPlanById).mockResolvedValue({ id: 'plan-1', isBuiltin: true, exercises: [{ exerciseId: 'bench' }] } as never);
    const db = {} as SQLiteDatabase;
    expect(await getReplacedExerciseChanges(db, workoutWith([{ replacementStatus: 'REPLACED', replacementAuditId: 'audit-1' }]))).toEqual([]);
  });

  it('proposes a change when a fully replaced exercise still has a slot in a personal plan', async () => {
    vi.mocked(getPlanById).mockResolvedValue({ id: 'plan-1', isBuiltin: false, exercises: [{ exerciseId: 'bench' }] } as never);
    vi.mocked(getExerciseById).mockImplementation(async (_db, id) => (id === 'bench' ? exercise('bench', 'Bench Press') : exercise('pushup', 'Push-Up')) as never);
    const db = { getFirstAsync: vi.fn(async () => ({ original_exercise_id: 'bench', replacement_exercise_id: 'pushup', reason: 'equipment_unavailable' })) } as unknown as SQLiteDatabase;
    const changes = await getReplacedExerciseChanges(db, workoutWith([{ id: 'we-1', replacementStatus: 'REPLACED', replacementAuditId: 'audit-1' }]));
    expect(changes).toEqual([{ workoutExerciseId: 'we-1', originalExerciseId: 'bench', originalExerciseName: 'Bench Press', replacementExerciseId: 'pushup', replacementExerciseName: 'Push-Up', reason: 'equipment_unavailable' }]);
  });

  it('ignores partially replaced and non-replaced exercises', async () => {
    vi.mocked(getPlanById).mockResolvedValue({ id: 'plan-1', isBuiltin: false, exercises: [{ exerciseId: 'bench' }] } as never);
    const db = {} as SQLiteDatabase;
    const changes = await getReplacedExerciseChanges(db, workoutWith([{ replacementStatus: 'PARTIALLY_REPLACED', replacementAuditId: 'audit-1' }, { replacementStatus: 'ORIGINAL' }]));
    expect(changes).toEqual([]);
  });

  it('ignores a replacement whose original exercise is no longer in the plan', async () => {
    vi.mocked(getPlanById).mockResolvedValue({ id: 'plan-1', isBuiltin: false, exercises: [{ exerciseId: 'squat' }] } as never);
    const db = { getFirstAsync: vi.fn(async () => ({ original_exercise_id: 'bench', replacement_exercise_id: 'pushup', reason: null })) } as unknown as SQLiteDatabase;
    const changes = await getReplacedExerciseChanges(db, workoutWith([{ replacementStatus: 'REPLACED', replacementAuditId: 'audit-1' }]));
    expect(changes).toEqual([]);
  });
});

describe('applyReplacementsToPlan', () => {
  const change = { workoutExerciseId: 'we-1', originalExerciseId: 'bench', originalExerciseName: 'Bench Press', replacementExerciseId: 'pushup', replacementExerciseName: 'Push-Up', reason: null };

  it('applies the exercise swap and touches the plan updated_at', async () => {
    const runAsync = vi.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const transaction = { getFirstAsync: vi.fn(async () => null), runAsync } as unknown as SQLiteDatabase;
    const db = { withExclusiveTransactionAsync: async (callback: (value: SQLiteDatabase) => Promise<void>) => callback(transaction) } as unknown as SQLiteDatabase;
    const result = await applyReplacementsToPlan(db, 'plan-1', [change]);
    expect(result).toEqual({ appliedCount: 1, skipped: [] });
    expect(runAsync).toHaveBeenCalledWith(expect.stringContaining('UPDATE plan_exercises'), ['pushup', 'plan-1', 'bench']);
  });

  it('skips a change whose replacement is already in the plan, while still applying the others', async () => {
    const otherChange = { workoutExerciseId: 'we-2', originalExerciseId: 'row', originalExerciseName: 'Barbell Row', replacementExerciseId: 'lat-pulldown', replacementExerciseName: 'Lat Pulldown', reason: null };
    const runAsync = vi.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    // First duplicate-check call (for `change`) reports an existing row; the second (for `otherChange`) reports none.
    const getFirstAsync = vi.fn().mockResolvedValueOnce({ id: 'existing-row' }).mockResolvedValueOnce(null);
    const transaction = { getFirstAsync, runAsync } as unknown as SQLiteDatabase;
    const db = { withExclusiveTransactionAsync: async (callback: (value: SQLiteDatabase) => Promise<void>) => callback(transaction) } as unknown as SQLiteDatabase;
    const result = await applyReplacementsToPlan(db, 'plan-1', [change, otherChange]);
    expect(result.appliedCount).toBe(1);
    expect(result.skipped).toEqual([{ originalExerciseName: 'Bench Press', replacementExerciseName: 'Push-Up', reason: 'already in this workout' }]);
    expect(runAsync).toHaveBeenCalledWith(expect.stringContaining('UPDATE plan_exercises'), ['lat-pulldown', 'plan-1', 'row']);
  });

  it('throws when every selected change was skipped', async () => {
    const transaction = { getFirstAsync: vi.fn(async () => ({ id: 'existing-row' })), runAsync: vi.fn(async () => ({ changes: 1, lastInsertRowId: 0 })) } as unknown as SQLiteDatabase;
    const db = { withExclusiveTransactionAsync: async (callback: (value: SQLiteDatabase) => Promise<void>) => callback(transaction) } as unknown as SQLiteDatabase;
    await expect(applyReplacementsToPlan(db, 'plan-1', [change])).rejects.toThrow('None of the selected changes');
  });
});
