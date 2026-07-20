import type { SQLiteDatabase } from 'expo-sqlite';

import type { Exercise } from '@/types/exercise';
import type { PlanExerciseInput, WorkoutPlanExercise } from '@/types/workoutPlan';
import { createId } from '@/utils/ids';
import { normalizePlanExerciseOrder } from '@/services/workoutPlanService';

interface JoinedRow {
  id: string; plan_id: string; exercise_id: string; exercise_order: number;
  target_sets: number | null; target_reps_min: number | null; target_reps_max: number | null;
  target_weight: number | null; rest_seconds: number | null; notes: string | null;
  name: string; category: Exercise['category']; primary_muscles: string | null;
  secondary_muscles: string | null; equipment: Exercise['equipment'];
  exercise_type: Exercise['exerciseType']; instructions: string | null;
  is_builtin: number; is_archived: number; created_at: string; updated_at: string;
}

function parseStrings(value: string | null): string[] {
  if (!value) return [];
  try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []; }
  catch { return []; }
}

function mapRow(row: JoinedRow): WorkoutPlanExercise {
  return {
    id: row.id, planId: row.plan_id, exerciseId: row.exercise_id, exerciseOrder: row.exercise_order,
    targetSets: row.target_sets, targetRepsMin: row.target_reps_min, targetRepsMax: row.target_reps_max,
    targetWeight: row.target_weight, restSeconds: row.rest_seconds, notes: row.notes,
    exercise: { id: row.exercise_id, name: row.name, category: row.category,
      primaryMuscles: parseStrings(row.primary_muscles), secondaryMuscles: parseStrings(row.secondary_muscles),
      equipment: row.equipment, exerciseType: row.exercise_type, instructions: parseStrings(row.instructions),
      isBuiltin: row.is_builtin === 1, isArchived: row.is_archived === 1,
      createdAt: row.created_at, updatedAt: row.updated_at },
  };
}

export async function getPlanExercises(db: SQLiteDatabase, planId: string): Promise<WorkoutPlanExercise[]> {
  const rows = await db.getAllAsync<JoinedRow>(`
    SELECT pe.*, e.name, e.category, e.primary_muscles, e.secondary_muscles, e.equipment,
      e.exercise_type, e.instructions, e.is_builtin, e.is_archived, e.created_at, e.updated_at
    FROM plan_exercises pe JOIN exercises e ON e.id = pe.exercise_id
    WHERE pe.plan_id = ? ORDER BY pe.exercise_order`, [planId]);
  return rows.map(mapRow);
}

export async function replacePlanExercises(
  db: SQLiteDatabase, planId: string, exercises: PlanExerciseInput[], inTransaction = false,
): Promise<void> {
  const execute = async (transaction: SQLiteDatabase) => {
    await transaction.runAsync('DELETE FROM plan_exercises WHERE plan_id = ?', [planId]);
    const statement = await transaction.prepareAsync(`INSERT INTO plan_exercises
      (id, plan_id, exercise_id, exercise_order, target_sets, target_reps_min, target_reps_max,
       target_weight, rest_seconds, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    try {
      for (const item of normalizePlanExerciseOrder(exercises)) {
        await statement.executeAsync([item.id ?? createId('plan_exercise'), planId, item.exerciseId,
          item.exerciseOrder, item.targetSets, item.targetRepsMin, item.targetRepsMax,
          item.targetWeight, item.restSeconds, item.notes]);
      }
    } finally { await statement.finalizeAsync(); }
  };
  if (inTransaction) await execute(db);
  else await db.withExclusiveTransactionAsync(execute);
}

export async function reorderPlanExercises(
  db: SQLiteDatabase, planId: string, orderedIds: string[],
): Promise<void> {
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const statement = await transaction.prepareAsync(
      'UPDATE plan_exercises SET exercise_order = ? WHERE id = ? AND plan_id = ?',
    );
    try {
      for (const [index, id] of orderedIds.entries()) await statement.executeAsync([index, id, planId]);
    } finally { await statement.finalizeAsync(); }
  });
}
