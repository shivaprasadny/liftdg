import type { SQLiteDatabase } from 'expo-sqlite';

import exercises from '@/data/exercises.json';
import exerciseVideos from '@/data/exerciseVideos.json';
import starterPlans from '@/data/starterPlans.json';
import type { ExerciseSeed } from '@/types/exercise';
import type { ExerciseVideoSeed } from '@/types/exerciseVideo';
import type { StarterPlanSeed } from '@/types/workoutPlan';
import { createId } from '@/utils/ids';

import { EXERCISE_SEED_VERSION, EXERCISE_VIDEO_SEED_VERSION, STARTER_PLAN_SEED_VERSION } from './schema';

const seeds = exercises as ExerciseSeed[];
const planSeeds = starterPlans as StarterPlanSeed[];
const videoSeeds = exerciseVideos as ExerciseVideoSeed[];

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

/**
 * Curated default exercise videos ship as an empty seed file until real, verified YouTube links
 * are added (see DECISIONS.md). Re-running is safe: existing exercise IDs are refreshed by
 * (exercise_id, video_id), and the version key prevents re-seeding once nothing has changed.
 */
export async function seedExerciseVideos(db: SQLiteDatabase): Promise<void> {
  const setting = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?', ['exercise_video_seed_version'],
  );
  if (Number(setting?.value ?? 0) >= EXERCISE_VIDEO_SEED_VERSION) return;
  const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const orderByExercise = new Map<string, number>();
    for (const video of videoSeeds) {
      const order = orderByExercise.get(video.exerciseId) ?? 0;
      orderByExercise.set(video.exerciseId, order + 1);
      await transaction.runAsync(`INSERT INTO exercise_default_videos
        (id, exercise_id, title, video_id, channel_name, thumbnail_url, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(exercise_id, video_id) DO UPDATE SET
          title = excluded.title, channel_name = excluded.channel_name,
          thumbnail_url = excluded.thumbnail_url, sort_order = excluded.sort_order, updated_at = excluded.updated_at`,
      [createId('default_video'), video.exerciseId, video.title, video.videoId, video.channelName, video.thumbnailUrl, order, now, now]);
    }
    await transaction.runAsync(`INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ['exercise_video_seed_version', String(EXERCISE_VIDEO_SEED_VERSION), now]);
  });
}
