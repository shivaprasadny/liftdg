import type { SQLiteDatabase } from 'expo-sqlite';

import exercises from '@/data/exercises.json';
import starterPlans from '@/data/starterPlans.json';
import type { ExerciseSeed } from '@/types/exercise';
import type { StarterPlanSeed } from '@/types/workoutPlan';
import { createId } from '@/utils/ids';

import { EXERCISE_SEED_VERSION, STARTER_PLAN_SEED_VERSION } from './schema';

const seeds = exercises as ExerciseSeed[];
const planSeeds = starterPlans as StarterPlanSeed[];

export async function seedBuiltInExercises(db: SQLiteDatabase): Promise<void> {
  const setting = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    ['exercise_seed_version'],
  );
  if (Number(setting?.value ?? 0) >= EXERCISE_SEED_VERSION) return;

  const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const statement = await transaction.prepareAsync(`
      INSERT INTO exercises (
        id, name, category, primary_muscles, secondary_muscles, equipment,
        exercise_type, instructions, is_builtin, is_archived, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, category = excluded.category,
        primary_muscles = excluded.primary_muscles, secondary_muscles = excluded.secondary_muscles,
        equipment = excluded.equipment, exercise_type = excluded.exercise_type,
        instructions = excluded.instructions, updated_at = excluded.updated_at
    `);
    try {
      for (const exercise of seeds) {
        await statement.executeAsync([
          exercise.id, exercise.name, exercise.category, JSON.stringify(exercise.primaryMuscles),
          JSON.stringify(exercise.secondaryMuscles), exercise.equipment, exercise.exerciseType,
          JSON.stringify(exercise.instructions), now, now,
        ]);
      }
    } finally {
      await statement.finalizeAsync();
    }
    await transaction.runAsync(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      ['exercise_seed_version', String(EXERCISE_SEED_VERSION), now],
    );
  });
}

export async function seedStarterPlans(db: SQLiteDatabase): Promise<void> {
  const setting = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?', ['starter_plan_seed_version'],
  );
  if (Number(setting?.value ?? 0) >= STARTER_PLAN_SEED_VERSION) return;
  const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    for (const plan of planSeeds) {
      await transaction.runAsync(`INSERT INTO workout_plans
        (id, name, description, color, is_builtin, is_archived, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, 0, ?, ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name, description = excluded.description,
          color = excluded.color, updated_at = excluded.updated_at`,
      [plan.id, plan.name, plan.description, plan.color, now, now]);
      await transaction.runAsync('DELETE FROM plan_exercises WHERE plan_id = ?', [plan.id]);
      for (const [index, item] of plan.exercises.entries()) {
        await transaction.runAsync(`INSERT INTO plan_exercises
          (id, plan_id, exercise_id, exercise_order, target_sets, target_reps_min,
           target_reps_max, target_weight, rest_seconds, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [createId('plan_exercise'), plan.id, item.exerciseId, index, item.targetSets,
          item.targetRepsMin, item.targetRepsMax, item.targetWeight, item.restSeconds, item.notes]);
      }
    }
    await transaction.runAsync(`INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ['starter_plan_seed_version', String(STARTER_PLAN_SEED_VERSION), now]);
  });
}
