import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SQLiteDatabase } from 'expo-sqlite';

export const ONBOARDING_VERSION = 1;
const onboardingKey = 'liftdg.onboarding.version';

export async function isOnboardingComplete(): Promise<boolean> { return Number(await AsyncStorage.getItem(onboardingKey) ?? 0) >= ONBOARDING_VERSION; }
export async function completeOnboarding(): Promise<void> { await AsyncStorage.setItem(onboardingKey, String(ONBOARDING_VERSION)); }
export async function resetOnboarding(): Promise<void> { await AsyncStorage.removeItem(onboardingKey); }

/** Sample rows use stable IDs and labels so Settings can remove only explicitly requested examples. */
export async function createOptionalSampleData(db: SQLiteDatabase): Promise<void> {
  if (await db.getFirstAsync<{ id: string }>('SELECT id FROM workouts WHERE id = ?', ['sample_workout_v1'])) return;
  const completed = new Date(Date.now() - 86_400_000); const end = completed.toISOString();
  const start = new Date(completed.getTime() - 2_700_000).toISOString();
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync(`INSERT INTO workouts
      (id, plan_id, name, workout_type, started_at, completed_at, duration_seconds, notes, status, created_at, updated_at)
      VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'completed', ?, ?)`,
    ['sample_workout_v1', 'Sample Full Body', 'mixed', start, end, 2700, 'LiftDG sample data', end, end]);
    await tx.runAsync(`INSERT INTO workout_exercises
      (id, workout_id, exercise_id, exercise_order, target_sets, target_reps_min, target_reps_max, target_weight, rest_seconds, notes, started_at, completed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['sample_workout_exercise_v1', 'sample_workout_v1', 'chest_barbell_bench_press', 0, 3, 8, 10, 40, 90, 'Sample exercise', start, end]);
    for (let index = 1; index <= 3; index += 1) {
      await tx.runAsync(`INSERT INTO workout_sets
        (id, workout_exercise_id, set_number, weight, reps, set_type, rpe, completed, completed_at, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'working', ?, 1, ?, 'Sample set', ?, ?)`,
      [`sample_set_v1_${index}`, 'sample_workout_exercise_v1', index, 40, index === 3 ? 8 : 10, 7, end, end, end]);
    }
    await tx.runAsync(`INSERT INTO cardio_sessions
      (id, workout_id, activity_type, date, duration_seconds, distance, calories, average_pace_seconds_per_unit, average_speed, notes, created_at, updated_at)
      VALUES (?, ?, 'running', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ['sample_cardio_v1', 'sample_workout_v1', end, 600, 1.5, 90, 400, 9, 'Sample cardio finisher', end, end]);
  });
}
export async function deleteSampleData(db: SQLiteDatabase): Promise<void> { await db.runAsync("DELETE FROM workouts WHERE id = 'sample_workout_v1' OR notes = 'LiftDG sample data'"); }
