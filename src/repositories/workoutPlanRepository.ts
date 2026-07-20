import type { SQLiteDatabase } from 'expo-sqlite';

import { assertUserOwnedPlan, createDuplicateInput } from '@/services/workoutPlanService';
import type { CreateWorkoutPlanInput, UpdateWorkoutPlanInput, WorkoutPlan, WorkoutPlanWithExercises } from '@/types/workoutPlan';
import { createId } from '@/utils/ids';
import { workoutPlanSchema } from '@/utils/planValidation';

import { getPlanExercises, replacePlanExercises } from './planExerciseRepository';

interface PlanRow {
  id: string; name: string; description: string | null; color: string | null;
  is_builtin: number; is_archived: number; created_at: string; updated_at: string;
  exercise_count: number; estimated_set_count: number;
}

function mapPlan(row: PlanRow): WorkoutPlan {
  return { id: row.id, name: row.name, description: row.description, color: row.color,
    isBuiltin: row.is_builtin === 1, isArchived: row.is_archived === 1,
    createdAt: row.created_at, updatedAt: row.updated_at,
    exerciseCount: row.exercise_count, estimatedSetCount: row.estimated_set_count };
}

const selectPlans = `SELECT wp.*, COUNT(pe.id) AS exercise_count,
  COALESCE(SUM(pe.target_sets), 0) AS estimated_set_count
  FROM workout_plans wp LEFT JOIN plan_exercises pe ON pe.plan_id = wp.id`;

async function queryPlans(db: SQLiteDatabase, where: string, params: string[] = []): Promise<WorkoutPlan[]> {
  const rows = await db.getAllAsync<PlanRow>(`${selectPlans} ${where}
    GROUP BY wp.id ORDER BY wp.updated_at DESC`, params);
  return rows.map(mapPlan);
}

export async function getAllPlans(db: SQLiteDatabase, search = ''): Promise<WorkoutPlan[]> {
  const term = `%${search.trim()}%`;
  return queryPlans(db, `WHERE wp.is_archived = 0 AND (wp.name LIKE ? OR COALESCE(wp.description, '') LIKE ?)`, [term, term]);
}
export async function getUserPlans(db: SQLiteDatabase, search = ''): Promise<WorkoutPlan[]> {
  const term = `%${search.trim()}%`;
  return queryPlans(db, `WHERE wp.is_archived = 0 AND wp.is_builtin = 0 AND (wp.name LIKE ? OR COALESCE(wp.description, '') LIKE ?)`, [term, term]);
}
export async function getBuiltInPlans(db: SQLiteDatabase, search = ''): Promise<WorkoutPlan[]> {
  const term = `%${search.trim()}%`;
  return queryPlans(db, `WHERE wp.is_archived = 0 AND wp.is_builtin = 1 AND (wp.name LIKE ? OR COALESCE(wp.description, '') LIKE ?)`, [term, term]);
}

export async function getPlanById(db: SQLiteDatabase, id: string): Promise<WorkoutPlanWithExercises | null> {
  const rows = await queryPlans(db, 'WHERE wp.id = ?', [id]);
  if (!rows[0]) return null;
  return { ...rows[0], exercises: await getPlanExercises(db, id) };
}

export async function createPlan(db: SQLiteDatabase, input: CreateWorkoutPlanInput): Promise<WorkoutPlanWithExercises> {
  const validated = workoutPlanSchema.parse(input); const id = createId('plan'); const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(`INSERT INTO workout_plans
      (id, name, description, color, is_builtin, is_archived, created_at, updated_at)
      VALUES (?, ?, ?, ?, 0, 0, ?, ?)`, [id, validated.name.trim(), validated.description, validated.color, now, now]);
    await replacePlanExercises(transaction, id, validated.exercises, true);
  });
  const plan = await getPlanById(db, id); if (!plan) throw new Error('Plan was not created'); return plan;
}

export async function updatePlan(db: SQLiteDatabase, input: UpdateWorkoutPlanInput): Promise<WorkoutPlanWithExercises> {
  const validated = workoutPlanSchema.parse(input);
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const existing = await transaction.getFirstAsync<{ is_builtin: number }>('SELECT is_builtin FROM workout_plans WHERE id = ?', [input.id]);
    if (!existing) throw new Error('Plan not found'); assertUserOwnedPlan(existing.is_builtin === 1, 'edited');
    await transaction.runAsync(`UPDATE workout_plans SET name = ?, description = ?, color = ?, updated_at = ?
      WHERE id = ? AND is_archived = 0`, [validated.name.trim(), validated.description, validated.color, new Date().toISOString(), input.id]);
    await replacePlanExercises(transaction, input.id, validated.exercises, true);
  });
  const plan = await getPlanById(db, input.id); if (!plan) throw new Error('Plan was not updated'); return plan;
}

export async function archivePlan(db: SQLiteDatabase, id: string): Promise<void> {
  const result = await db.runAsync('UPDATE workout_plans SET is_archived = 1, updated_at = ? WHERE id = ?', [new Date().toISOString(), id]);
  if (result.changes !== 1) throw new Error('Plan not found');
}

export async function deletePlan(db: SQLiteDatabase, id: string): Promise<void> {
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const plan = await transaction.getFirstAsync<{ is_builtin: number }>('SELECT is_builtin FROM workout_plans WHERE id = ?', [id]);
    if (!plan) throw new Error('Plan not found'); assertUserOwnedPlan(plan.is_builtin === 1, 'deleted');
    await transaction.runAsync('DELETE FROM workout_plans WHERE id = ?', [id]);
  });
}

export async function duplicatePlan(db: SQLiteDatabase, id: string): Promise<WorkoutPlanWithExercises> {
  const source = await getPlanById(db, id); if (!source) throw new Error('Plan not found');
  return createPlan(db, createDuplicateInput(source));
}
