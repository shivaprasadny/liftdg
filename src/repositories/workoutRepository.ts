import type { SQLiteDatabase } from 'expo-sqlite';

import { assertCanStartWorkout, buildWorkoutSnapshot, elapsedSeconds, removeWorkoutExerciseId, summarizeWorkout } from '@/services/workoutService';
import type { Exercise } from '@/types/exercise';
import type { ActiveWorkout, SetType, Workout, WorkoutExercise, WorkoutSet, WorkoutSetUpdate, WorkoutSummary } from '@/types/workout';
import type { WorkoutPlanWithExercises } from '@/types/workoutPlan';
import { AppError, toAppError } from '@/utils/errors'; import { createId } from '@/utils/ids';

interface WorkoutRow { id: string; plan_id: string | null; name: string; workout_type: Workout['workoutType']; started_at: string; completed_at: string | null; duration_seconds: number | null; notes: string | null; status: Workout['status']; created_at: string; updated_at: string; }
interface ExerciseRow { id: string; workout_id: string; exercise_id: string; exercise_order: number; target_sets: number | null; target_reps_min: number | null; target_reps_max: number | null; target_weight: number | null; rest_seconds: number | null; notes: string | null; started_at: string | null; completed_at: string | null; name: string; category: Exercise['category']; primary_muscles: string | null; secondary_muscles: string | null; equipment: Exercise['equipment']; exercise_type: Exercise['exerciseType']; instructions: string | null; is_builtin: number; is_archived: number; exercise_created_at: string; exercise_updated_at: string; }
interface SetRow { id: string; workout_exercise_id: string; set_number: number; weight: number | null; reps: number | null; set_type: SetType; rpe: number | null; completed: number; completed_at: string | null; notes: string | null; created_at: string | null; updated_at: string | null; }
const parse = (value: string | null): string[] => { if (!value) return []; try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []; } catch { return []; } };
const mapWorkout = (row: WorkoutRow): Workout => ({ id: row.id, planId: row.plan_id, name: row.name, workoutType: row.workout_type, startedAt: row.started_at, completedAt: row.completed_at, durationSeconds: row.duration_seconds, notes: row.notes, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at });
const mapSet = (row: SetRow): WorkoutSet => ({ id: row.id, workoutExerciseId: row.workout_exercise_id, setNumber: row.set_number, weight: row.weight, reps: row.reps, setType: row.set_type, rpe: row.rpe, completed: row.completed === 1, completedAt: row.completed_at, notes: row.notes, createdAt: row.created_at ?? row.completed_at ?? '', updatedAt: row.updated_at ?? row.completed_at ?? '' });

async function hydrateWorkout(db: SQLiteDatabase, row: WorkoutRow): Promise<ActiveWorkout> {
  const exerciseRows = await db.getAllAsync<ExerciseRow>(`SELECT we.*, e.name, e.category, e.primary_muscles, e.secondary_muscles,
    e.equipment, e.exercise_type, e.instructions, e.is_builtin, e.is_archived,
    e.created_at AS exercise_created_at, e.updated_at AS exercise_updated_at
    FROM workout_exercises we JOIN exercises e ON e.id = we.exercise_id
    WHERE we.workout_id = ? ORDER BY we.exercise_order`, [row.id]);
  const exercises: WorkoutExercise[] = [];
  for (const item of exerciseRows) {
    const sets = (await db.getAllAsync<SetRow>('SELECT * FROM workout_sets WHERE workout_exercise_id = ? ORDER BY set_number', [item.id])).map(mapSet);
    exercises.push({ id: item.id, workoutId: item.workout_id, exerciseId: item.exercise_id, exerciseOrder: item.exercise_order,
      targetSets: item.target_sets, targetRepsMin: item.target_reps_min, targetRepsMax: item.target_reps_max,
      targetWeight: item.target_weight, restSeconds: item.rest_seconds, notes: item.notes, startedAt: item.started_at, completedAt: item.completed_at,
      sets, exercise: { id: item.exercise_id, name: item.name, category: item.category, primaryMuscles: parse(item.primary_muscles), secondaryMuscles: parse(item.secondary_muscles), equipment: item.equipment, exerciseType: item.exercise_type, instructions: parse(item.instructions), isBuiltin: item.is_builtin === 1, isArchived: item.is_archived === 1, createdAt: item.exercise_created_at, updatedAt: item.exercise_updated_at } });
  }
  return { ...mapWorkout(row), exercises };
}

export async function getActiveWorkout(db: SQLiteDatabase): Promise<ActiveWorkout | null> {
  const row = await db.getFirstAsync<WorkoutRow>("SELECT * FROM workouts WHERE status = 'active' LIMIT 1"); return row ? hydrateWorkout(db, row) : null;
}
export async function getWorkoutById(db: SQLiteDatabase, id: string): Promise<ActiveWorkout | null> {
  const row = await db.getFirstAsync<WorkoutRow>('SELECT * FROM workouts WHERE id = ?', [id]); return row ? hydrateWorkout(db, row) : null;
}

async function assertNoActive(transaction: SQLiteDatabase): Promise<void> {
  const active = await transaction.getFirstAsync<{ id: string }>("SELECT id FROM workouts WHERE status = 'active' LIMIT 1");
  assertCanStartWorkout(active?.id ?? null);
}

/** Creates the workout, target snapshots, and initial sets atomically. */
export async function createWorkoutFromPlan(db: SQLiteDatabase, plan: WorkoutPlanWithExercises): Promise<string> {
  const workoutId = createId('workout'); const now = new Date().toISOString(); const snapshot = buildWorkoutSnapshot(plan);
  try { await db.withExclusiveTransactionAsync(async (transaction) => { await assertNoActive(transaction);
    await transaction.runAsync(`INSERT INTO workouts (id, plan_id, name, workout_type, started_at, status, created_at, updated_at)
      VALUES (?, ?, ?, 'strength', ?, 'active', ?, ?)`, [workoutId, plan.id, plan.name, now, now, now]);
    for (const item of snapshot) { await transaction.runAsync(`INSERT INTO workout_exercises
      (id, workout_id, exercise_id, exercise_order, target_sets, target_reps_min, target_reps_max, target_weight, rest_seconds, notes, started_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [item.id, workoutId, item.exerciseId, item.exerciseOrder, item.targetSets, item.targetRepsMin, item.targetRepsMax, item.targetWeight, item.restSeconds, item.notes, now]);
      for (const [index, setId] of item.setIds.entries()) await transaction.runAsync(`INSERT INTO workout_sets
        (id, workout_exercise_id, set_number, weight, reps, set_type, completed, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'working', 0, ?, ?)`, [setId, item.id, index + 1, item.targetWeight, item.targetRepsMin, now, now]); }
  }); return workoutId; } catch (error) { throw toAppError(error, 'Could not start this workout.'); }
}

export async function createEmptyWorkout(db: SQLiteDatabase, name: string): Promise<string> {
  const trimmed = name.trim(); if (trimmed.length < 2) throw new AppError('Workout name must be at least 2 characters.');
  const id = createId('workout'); const now = new Date().toISOString();
  try { await db.withExclusiveTransactionAsync(async (transaction) => { await assertNoActive(transaction);
    await transaction.runAsync(`INSERT INTO workouts (id, name, workout_type, started_at, status, created_at, updated_at)
      VALUES (?, ?, 'strength', ?, 'active', ?, ?)`, [id, trimmed, now, now, now]); }); return id;
  } catch (error) { throw toAppError(error, 'Could not start an empty workout.'); }
}

export async function addExercisesToWorkout(db: SQLiteDatabase, workoutId: string, exerciseIds: string[]): Promise<void> {
  const now = new Date().toISOString(); await db.withExclusiveTransactionAsync(async (transaction) => {
    const count = await transaction.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM workout_exercises WHERE workout_id = ?', [workoutId]); let order = count?.count ?? 0;
    for (const exerciseId of exerciseIds) { const exists = await transaction.getFirstAsync('SELECT id FROM workout_exercises WHERE workout_id = ? AND exercise_id = ?', [workoutId, exerciseId]); if (exists) continue;
      const linkId = createId('workout_exercise'); await transaction.runAsync(`INSERT INTO workout_exercises
        (id, workout_id, exercise_id, exercise_order, target_sets, target_reps_min, target_reps_max, rest_seconds, started_at)
        VALUES (?, ?, ?, ?, 3, 8, 12, 90, ?)`, [linkId, workoutId, exerciseId, order++, now]);
      for (let set = 1; set <= 3; set++) await transaction.runAsync(`INSERT INTO workout_sets
        (id, workout_exercise_id, set_number, set_type, completed, created_at, updated_at) VALUES (?, ?, ?, 'working', 0, ?, ?)`, [createId('workout_set'), linkId, set, now, now]); }
    await transaction.runAsync('UPDATE workouts SET updated_at = ? WHERE id = ?', [now, workoutId]);
  });
}

export async function updateWorkoutSet(db: SQLiteDatabase, id: string, value: WorkoutSetUpdate): Promise<void> {
  const now = new Date().toISOString(); await db.runAsync(`UPDATE workout_sets SET weight = ?, reps = ?, set_type = ?, rpe = ?, completed = ?,
    completed_at = ?, notes = ?, updated_at = ? WHERE id = ?`, [value.weight, value.reps, value.setType, value.rpe, value.completed ? 1 : 0, value.completed ? now : null, value.notes, now, id]);
}
/** Persists top-level notes without leaving the only copy in React memory. */
export async function updateWorkoutNotes(db: SQLiteDatabase, workoutId: string, notes: string | null): Promise<void> {
  await db.runAsync('UPDATE workouts SET notes = ?, updated_at = ? WHERE id = ?', [notes, new Date().toISOString(), workoutId]);
}
export async function addWorkoutSet(db: SQLiteDatabase, workoutExerciseId: string, copy?: WorkoutSet): Promise<void> {
  const row = await db.getFirstAsync<{ next: number }>('SELECT COALESCE(MAX(set_number), 0) + 1 AS next FROM workout_sets WHERE workout_exercise_id = ?', [workoutExerciseId]); const now = new Date().toISOString();
  await db.runAsync(`INSERT INTO workout_sets (id, workout_exercise_id, set_number, weight, reps, set_type, rpe, completed, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`, [createId('workout_set'), workoutExerciseId, row?.next ?? 1, copy?.weight ?? null, copy?.reps ?? null, copy?.setType ?? 'working', copy?.rpe ?? null, copy?.notes ?? null, now, now]);
}
export async function deleteWorkoutSet(db: SQLiteDatabase, id: string): Promise<void> { await db.runAsync('DELETE FROM workout_sets WHERE id = ?', [id]); }
export async function workoutExerciseHasCompletedSets(db: SQLiteDatabase, id: string): Promise<boolean> { return Boolean(await db.getFirstAsync('SELECT id FROM workout_sets WHERE workout_exercise_id = ? AND completed = 1 LIMIT 1', [id])); }
export async function removeWorkoutExercise(db: SQLiteDatabase, id: string): Promise<void> { await db.withExclusiveTransactionAsync(async (transaction) => { const row = await transaction.getFirstAsync<{ workout_id: string }>('SELECT workout_id FROM workout_exercises WHERE id = ?', [id]); if (!row) return; const current = await transaction.getAllAsync<{ id: string }>('SELECT id FROM workout_exercises WHERE workout_id = ? ORDER BY exercise_order', [row.workout_id]); await transaction.runAsync('DELETE FROM workout_exercises WHERE id = ?', [id]); const remaining = removeWorkoutExerciseId(current.map((item) => item.id), id); for (const [index, itemId] of remaining.entries()) await transaction.runAsync('UPDATE workout_exercises SET exercise_order = ? WHERE id = ?', [index, itemId]); }); }
export async function reorderWorkoutExercise(db: SQLiteDatabase, workoutId: string, orderedIds: string[]): Promise<void> { await db.withExclusiveTransactionAsync(async (transaction) => { for (const [index, id] of orderedIds.entries()) await transaction.runAsync('UPDATE workout_exercises SET exercise_order = ? WHERE id = ? AND workout_id = ?', [index, id, workoutId]); }); }
export async function finishWorkout(db: SQLiteDatabase, workout: ActiveWorkout): Promise<void> { const now = new Date().toISOString(); await db.withExclusiveTransactionAsync(async (transaction) => { await transaction.runAsync(`UPDATE workouts SET status = 'completed', completed_at = ?, duration_seconds = ?, updated_at = ? WHERE id = ? AND status = 'active'`, [now, elapsedSeconds(workout.startedAt), now, workout.id]); }); }
/** Discard permanently deletes the active aggregate; child rows cascade in the same transaction. */
export async function discardWorkout(db: SQLiteDatabase, id: string): Promise<void> { await db.withExclusiveTransactionAsync(async (transaction) => { await transaction.runAsync("DELETE FROM workouts WHERE id = ? AND status = 'active'", [id]); }); }
export async function getWorkoutSummary(db: SQLiteDatabase, id: string): Promise<WorkoutSummary | null> { const workout = await getWorkoutById(db, id); return workout ? summarizeWorkout(workout) : null; }
