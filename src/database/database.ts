import type { SQLiteDatabase } from 'expo-sqlite';

import { runMigrations } from './migrations';
import { seedBuiltInExercises } from './seed';

export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  await runMigrations(db);
  await seedBuiltInExercises(db);
}
