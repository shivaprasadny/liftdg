import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_VERSION, migrationV1, migrationV2, migrationV3 } from './schema';

export async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version < 1) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(migrationV1);
    });
    version = 1;
  }

  if (version < 2) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(migrationV2);
    });
    version = 2;
  }

  if (version < 3) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(migrationV3);
    });
    version = 3;
  }

  if (version !== DATABASE_VERSION) {
    throw new Error(`Unsupported database version ${version}`);
  }
  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
