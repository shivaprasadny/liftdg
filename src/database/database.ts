import type { SQLiteDatabase } from 'expo-sqlite';

import { runMigrations } from './migrations';
import { seedBuiltInExercises, seedStarterPlans } from './seed';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await runMigrations(db);
  await seedBuiltInExercises(db);
  await seedStarterPlans(db);
}
