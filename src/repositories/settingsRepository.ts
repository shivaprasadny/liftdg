import type { SQLiteDatabase } from 'expo-sqlite';

export interface SettingRow { key: string; value: string; updatedAt: string }

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(`INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`, [key, value, now]);
}

export async function getAllSettings(db: SQLiteDatabase): Promise<SettingRow[]> {
  const rows = await db.getAllAsync<{ key: string; value: string; updated_at: string }>('SELECT key, value, updated_at FROM app_settings ORDER BY key');
  return rows.map((row) => ({ key: row.key, value: row.value, updatedAt: row.updated_at }));
}

export async function resetSettings(db: SQLiteDatabase): Promise<void> {
  await db.runAsync("DELETE FROM app_settings WHERE key LIKE 'preference.%'");
}

