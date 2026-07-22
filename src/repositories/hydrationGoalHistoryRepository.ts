import type { SQLiteDatabase } from 'expo-sqlite';

import { planGoalChangeEntries } from '@/services/hydrationService';
import type { HydrationGoalApplyMode, HydrationGoalHistoryEntry } from '@/types/hydration';
import { createId } from '@/utils/ids';

interface Row { id: string; goal_ml: number; effective_from: string; created_at: string; updated_at: string; }

function mapRow(row: Row): HydrationGoalHistoryEntry {
  return { id: row.id, goalMl: row.goal_ml, effectiveFrom: row.effective_from, createdAt: row.created_at, updatedAt: row.updated_at };
}

/** Ascending by effective date — callers walk forward to find the last entry on or before a given day. */
export async function getGoalHistory(db: SQLiteDatabase): Promise<HydrationGoalHistoryEntry[]> {
  const rows = await db.getAllAsync<Row>('SELECT * FROM hydration_goal_history ORDER BY effective_from ASC');
  return rows.map(mapRow);
}

/** Replaces any existing row for the same effective date, so re-editing "today" never creates a duplicate. */
export async function upsertGoalHistoryEntry(db: SQLiteDatabase, goalMl: number, effectiveFrom: string): Promise<void> {
  const now = new Date().toISOString();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync('DELETE FROM hydration_goal_history WHERE effective_from = ?', [effectiveFrom]);
    await transaction.runAsync(
      'INSERT INTO hydration_goal_history (id, goal_ml, effective_from, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [createId('hydration_goal'), goalMl, effectiveFrom, now, now],
    );
  });
}

export async function clearGoalHistory(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM hydration_goal_history');
}

/** Writes whatever history rows `planGoalChangeEntries` decides a goal change needs (see hydrationService). */
export async function applyHydrationGoalChange(
  db: SQLiteDatabase, currentGoalMl: number, newGoalMl: number, mode: HydrationGoalApplyMode,
): Promise<void> {
  const history = await getGoalHistory(db);
  const plans = planGoalChangeEntries(history, currentGoalMl, newGoalMl, mode, new Date());
  if (plans.some((plan) => plan.clearFirst)) await clearGoalHistory(db);
  for (const plan of plans) await upsertGoalHistoryEntry(db, plan.goalMl, plan.effectiveFrom);
}
