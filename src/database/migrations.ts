import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_VERSION, migrationV1, migrationV2, migrationV3, migrationV4, migrationV5, migrationV6, migrationV7, migrationV8, migrationV9, migrationV10, migrationV11, migrationV12, migrationV13, migrationV14, migrationV15, migrationV16, migrationV17, migrationV18, migrationV19, migrationV20 } from './schema';

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

  if (version < 4) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(migrationV4);
    });
    version = 4;
  }

  if (version < 5) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(migrationV5);
    });
    version = 5;
  }

  if (version < 6) {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      await transaction.execAsync(migrationV6);
    });
    version = 6;
  }

  if (version < 7) {
    await db.withExclusiveTransactionAsync(async (transaction) => { await transaction.execAsync(migrationV7); });
    version = 7;
  }

  if (version < 8) {
    await db.withExclusiveTransactionAsync(async (transaction) => { await transaction.execAsync(migrationV8); });
    version = 8;
  }

  if (version < 9) {
    await db.withExclusiveTransactionAsync(async (transaction) => { await transaction.execAsync(migrationV9); });
    version = 9;
  }

  if (version < 10) {
    await db.withExclusiveTransactionAsync(async (transaction) => { await transaction.execAsync(migrationV10); });
    version = 10;
  }

  if (version < 11) {
    await db.withExclusiveTransactionAsync(async (transaction) => { await transaction.execAsync(migrationV11); });
    version = 11;
  }

  if (version < 12) {
    await db.withExclusiveTransactionAsync(async (transaction) => { await transaction.execAsync(migrationV12); });
    version = 12;
  }

  if (version < 13) {
    await db.withExclusiveTransactionAsync(async (transaction) => { await transaction.execAsync(migrationV13); });
    version = 13;
  }

  if (version < 14) {
    await db.withExclusiveTransactionAsync(async (transaction) => { await transaction.execAsync(migrationV14); });
    version = 14;
  }

  if (version < 15) {
    await db.withExclusiveTransactionAsync(async (transaction) => { await transaction.execAsync(migrationV15); });
    version = 15;
  }
  if (version < 16) { await db.withExclusiveTransactionAsync(async transaction=>transaction.execAsync(migrationV16)); version=16; }
  if (version < 17) { await db.withExclusiveTransactionAsync(async transaction=>transaction.execAsync(migrationV17)); version=17; }
  if (version < 18) { await db.withExclusiveTransactionAsync(async transaction=>transaction.execAsync(migrationV18)); version=18; }
  if (version < 19) { await db.withExclusiveTransactionAsync(async transaction=>transaction.execAsync(migrationV19)); version=19; }
  if (version < 20) { await db.withExclusiveTransactionAsync(async transaction=>transaction.execAsync(migrationV20)); version=20; }

  if (version !== DATABASE_VERSION) {
    throw new Error(`Unsupported database version ${version}`);
  }
  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
