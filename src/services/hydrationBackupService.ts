import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getGoalHistory } from '@/repositories/hydrationGoalHistoryRepository';
import { getAllWaterEntries } from '@/repositories/waterEntryRepository';
import { AppError, toAppError } from '@/utils/errors';

/**
 * A standalone hydration-only JSON export, offered before a destructive reset. Deliberately not
 * part of the versioned app-wide `LiftDGBackup` format (DECISIONS.md #18-20) — it exists purely as
 * a personal safety copy, not a restorable backup contract, so it never needs its own format version.
 */
export async function exportHydrationJson(db: SQLiteDatabase): Promise<void> {
  try {
    const [entries, goalHistory] = await Promise.all([getAllWaterEntries(db), getGoalHistory(db)]);
    const payload = { exportedAt: new Date().toISOString(), waterEntries: entries, goalHistory };
    const file = new File(Paths.cache, `LiftDG-hydration-${new Date().toISOString().slice(0, 10)}.json`);
    file.create({ overwrite: true });
    file.write(JSON.stringify(payload, null, 2));
    if (!await Sharing.isAvailableAsync()) throw new AppError('File sharing is unavailable on this device.');
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Export hydration data' });
  } catch (error) { throw toAppError(error, 'Could not export hydration data.'); }
}
