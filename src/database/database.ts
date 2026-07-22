import type { SQLiteDatabase } from 'expo-sqlite';

import { backfillPersonalRecords } from '@/services/personalRecordService';

import { runMigrations } from './migrations';
import { seedBuiltInExercises, seedBuiltInPrograms, seedExerciseReplacements, seedExerciseVideos, seedPlateCalculator, seedStarterPlans } from './seed';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await runMigrations(db);
  await seedBuiltInExercises(db);
  await seedStarterPlans(db);
  await seedBuiltInPrograms(db);
  await seedExerciseVideos(db);
  await seedPlateCalculator(db);
  await seedExerciseReplacements(db);
  // Deliberately not awaited: the app must not block launch on a potentially large historical
  // scan. A failure here is non-fatal (the Progress tab simply retries on next launch).
  void backfillPersonalRecords(db).catch((error) => { if (__DEV__) console.error('Personal-record backfill failed', error); });
}
