import type { SQLiteDatabase } from 'expo-sqlite';

import exercises from '@/data/exercises.json';
import type { ExerciseSeed } from '@/types/exercise';

import { EXERCISE_SEED_VERSION } from './schema';

const seeds = exercises as ExerciseSeed[];

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
