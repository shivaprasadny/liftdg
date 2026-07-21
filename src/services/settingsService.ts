import { z } from 'zod';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getAllSettings, setSetting } from '@/repositories/settingsRepository';
import type { AppSettingKey, AppSettings } from '@/types/settings';

export const DEFAULT_SETTINGS: AppSettings = {
  weightUnit: 'kg', distanceUnit: 'km', firstDayOfWeek: 1, defaultWorkoutName: 'Workout',
  defaultRestDuration: 90, automaticRestTimer: true, keepScreenAwake: false,
  confirmDeleteSets: true, confirmFinishWorkout: true, theme: 'system',
  compactWorkoutLayout: false, largerWorkoutControls: false, autoFillPreviousSet: true,
  autoStartRestTimer: true, defaultSetType: 'working', showRpe: true, showNotes: false,
  showPreviousPerformance: true, vibrationFeedback: true, timerSound: true,
  appLockEnabled: false, lockAfterBackground: true, lockDelaySeconds: 0,
  openWorkoutInListView: true, openFirstIncompleteExercise: false, autoAdvanceExercise: false,
  enableExerciseSwipeNavigation: false, showExercisePosition: true,
  heightUnit: 'cm', bodyMeasurementUnit: 'cm', showBodyProgressHome: true,
};

const settingsSchema = z.object({
  weightUnit: z.enum(['kg', 'lb']), distanceUnit: z.enum(['km', 'mi']), firstDayOfWeek: z.union([z.literal(0), z.literal(1)]),
  defaultWorkoutName: z.string().min(1).max(80), defaultRestDuration: z.number().int().min(0).max(3600),
  automaticRestTimer: z.boolean(), keepScreenAwake: z.boolean(), confirmDeleteSets: z.boolean(), confirmFinishWorkout: z.boolean(),
  theme: z.enum(['system', 'light', 'dark']), compactWorkoutLayout: z.boolean(), largerWorkoutControls: z.boolean(),
  autoFillPreviousSet: z.boolean(), autoStartRestTimer: z.boolean(), defaultSetType: z.string().min(1),
  showRpe: z.boolean(), showNotes: z.boolean(), showPreviousPerformance: z.boolean(), vibrationFeedback: z.boolean(), timerSound: z.boolean(),
  appLockEnabled: z.boolean(), lockAfterBackground: z.boolean(), lockDelaySeconds: z.number().int().min(0).max(86400),
  openWorkoutInListView: z.boolean(), openFirstIncompleteExercise: z.boolean(), autoAdvanceExercise: z.boolean(),
  enableExerciseSwipeNavigation: z.boolean(), showExercisePosition: z.boolean(),
  heightUnit: z.enum(['cm', 'ft_in']), bodyMeasurementUnit: z.enum(['cm', 'in']), showBodyProgressHome: z.boolean(),
});

const keyPrefix = 'preference.';
function decode(value: string): unknown { try { return JSON.parse(value); } catch { return value; } }

export function validateSettings(value: unknown): AppSettings { return settingsSchema.parse(value); }

/** Unknown and obsolete stored values are ignored so upgrades always retain safe defaults. */
export function migrateSettings(rows: { key: string; value: string }[]): AppSettings {
  const candidate: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const row of rows) if (row.key.startsWith(keyPrefix)) candidate[row.key.slice(keyPrefix.length)] = decode(row.value);
  const parsed = settingsSchema.safeParse(candidate);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function loadSettings(db: SQLiteDatabase): Promise<AppSettings> { return migrateSettings(await getAllSettings(db)); }
export async function updateSetting<K extends AppSettingKey>(db: SQLiteDatabase, key: K, value: AppSettings[K]): Promise<void> {
  const next = { ...(await loadSettings(db)), [key]: value }; validateSettings(next);
  await setSetting(db, `${keyPrefix}${key}`, JSON.stringify(value));
}
