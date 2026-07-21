import type { SQLiteDatabase } from 'expo-sqlite';

import type { WaterEntry } from '@/types/hydration';
import { AppError, toAppError } from '@/utils/errors';
import { createId } from '@/utils/ids';

interface WaterEntryRow { id: string; amount_ml: number; logged_at: string; created_at: string; updated_at: string; }

function mapEntry(row: WaterEntryRow): WaterEntry {
  return { id: row.id, amountMl: row.amount_ml, loggedAt: row.logged_at, createdAt: row.created_at, updatedAt: row.updated_at };
}

function assertValidAmount(amountMl: number): void {
  if (!Number.isFinite(amountMl) || amountMl <= 0 || amountMl > 5000) throw new AppError('Enter a valid water amount.');
}

export async function createWaterEntry(db: SQLiteDatabase, amountMl: number, loggedAt = new Date().toISOString()): Promise<WaterEntry> {
  assertValidAmount(amountMl);
  const id = createId('water'); const now = new Date().toISOString();
  try {
    await db.runAsync(
      'INSERT INTO water_entries (id, amount_ml, logged_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, amountMl, loggedAt, now, now],
    );
  } catch (error) { throw toAppError(error, 'Could not log this water intake.'); }
  return { id, amountMl, loggedAt, createdAt: now, updatedAt: now };
}

export async function deleteWaterEntry(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM water_entries WHERE id = ?', [id]);
}

/** The single most recently logged entry overall, used to "undo" the last quick-add action. */
export async function getMostRecentWaterEntry(db: SQLiteDatabase): Promise<WaterEntry | null> {
  const row = await db.getFirstAsync<WaterEntryRow>(
    'SELECT * FROM water_entries ORDER BY logged_at DESC, created_at DESC LIMIT 1',
  );
  return row ? mapEntry(row) : null;
}

/** Used only by the "Reset hydration stats" settings action; irreversible. */
export async function deleteAllWaterEntries(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM water_entries');
}

/** Ascending by logged time, inclusive bounds — bounded to a window (e.g. year-to-date) by the caller. */
export async function getWaterEntriesInRange(db: SQLiteDatabase, fromIso: string, toIso: string): Promise<WaterEntry[]> {
  const rows = await db.getAllAsync<WaterEntryRow>(
    'SELECT * FROM water_entries WHERE logged_at >= ? AND logged_at <= ? ORDER BY logged_at ASC', [fromIso, toIso],
  );
  return rows.map(mapEntry);
}
