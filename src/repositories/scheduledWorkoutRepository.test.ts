import type { SQLiteDatabase } from 'expo-sqlite';
import { describe, expect, it, vi } from 'vitest';

import { cancelProgramSchedule, getProgramScheduleBatches } from './scheduledWorkoutRepository';

describe('program schedule management', () => {
  it('does not return cancelled occurrences to the visible calendar', async () => {
    const getAllAsync = vi.fn(async () => []);
    const db = { getAllAsync } as unknown as SQLiteDatabase;
    const { getScheduledWorkoutsInRange } = await import('./scheduledWorkoutRepository');
    await getScheduledWorkoutsInRange(db, '2026-07-01', '2026-07-31');
    const calls = getAllAsync.mock.calls as unknown as [string, unknown[]][];
    expect(calls[0][0]).toContain("status != 'cancelled'");
  });

  it('maps each program-start operation to a separately manageable schedule run', async () => {
    const db = {
      getAllAsync: vi.fn(async () => [{
        batch_created_at: '2026-07-22T12:00:00.000Z', start_date: '2026-07-23', end_date: '2026-08-20',
        total_count: 12, eligible_count: 8, completed_count: 3, in_progress_count: 1, cancelled_count: 0,
      }]),
    } as unknown as SQLiteDatabase;

    await expect(getProgramScheduleBatches(db, 'program-1')).resolves.toEqual([{
      programId: 'program-1', batchCreatedAt: '2026-07-22T12:00:00.000Z', startDate: '2026-07-23',
      endDate: '2026-08-20', totalCount: 12, eligibleCount: 8, completedCount: 3, inProgressCount: 1,
      cancelledCount: 0,
    }]);
  });

  it('cancels only today and future eligible occurrences and reports protected workouts', async () => {
    const runAsync = vi.fn(async () => ({ changes: 8, lastInsertRowId: 0 }));
    const transaction = {
      getFirstAsync: vi.fn(async () => ({ completed_count: 3, in_progress_count: 1 })),
      runAsync,
    } as unknown as SQLiteDatabase;
    const db = {
      withExclusiveTransactionAsync: async (callback: (value: SQLiteDatabase) => Promise<void>) => callback(transaction),
    } as unknown as SQLiteDatabase;

    await expect(cancelProgramSchedule(db, 'program-1', 'batch-1')).resolves.toEqual({
      cancelledCount: 8,
      preservedCompletedCount: 3,
      preservedInProgressCount: 1,
    });
    const calls = runAsync.mock.calls as unknown as [string, unknown[]][];
    expect(calls[0][0]).toContain("status IN ('scheduled','missed','skipped')");
    expect(calls[0][0]).toContain('scheduled_date>=?');
    expect(calls[0][1]).toEqual([expect.any(String), 'program-1', 'batch-1', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)]);
  });
});
