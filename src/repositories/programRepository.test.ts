import type { SQLiteDatabase } from 'expo-sqlite';
import { describe, expect, it, vi } from 'vitest';

import { createProgram, deleteProgram, updateProgram } from './programRepository';

describe('createProgram', () => {
  it('creates every week and workout day in one transaction', async () => {
    const runAsync = vi.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const transaction = { runAsync } as unknown as SQLiteDatabase;
    const db = {
      withExclusiveTransactionAsync: async (callback: (value: SQLiteDatabase) => Promise<void>) => callback(transaction),
      getFirstAsync: vi.fn(async () => ({
        id: 'program-1', name: 'My Program', description: null, category: 'My Programs', goal: null,
        difficulty: 'beginner', duration_weeks: 2, days_per_week: 2, estimated_session_minutes: null,
        equipment_level: null, is_builtin: 0, is_featured: 0, is_favorite: 0, is_archived: 0,
        version: 1, notes: null, created_at: '2026-01-01', updated_at: '2026-01-01',
      })),
      getAllAsync: vi.fn(async () => []),
    } as unknown as SQLiteDatabase;

    const result = await createProgram(db, {
      name: 'My Program', description: null, difficulty: 'beginner', durationWeeks: 2,
      weeks: [
        { weekNumber: 1, days: [
          { dayNumber: 1, dayLabel: 'Push', planId: 'push', workoutType: 'strength', estimatedDurationMinutes: null, notes: null },
          { dayNumber: 2, dayLabel: 'Pull', planId: 'pull', workoutType: 'strength', estimatedDurationMinutes: null, notes: null },
        ] },
        { weekNumber: 2, days: [
          { dayNumber: 1, dayLabel: 'Legs', planId: 'legs', workoutType: 'strength', estimatedDurationMinutes: null, notes: null },
          { dayNumber: 2, dayLabel: 'Push', planId: 'push', workoutType: 'strength', estimatedDurationMinutes: null, notes: null },
        ] },
      ],
    });

    expect(result.name).toBe('My Program');
    const calls = runAsync.mock.calls as unknown as [string, unknown[]][];
    expect(calls.filter(([sql]) => sql.includes('INSERT INTO program_templates'))).toHaveLength(1);
    expect(calls.filter(([sql]) => sql.includes('INSERT INTO program_weeks'))).toHaveLength(2);
    expect(calls.filter(([sql]) => sql.includes('INSERT INTO program_days'))).toHaveLength(4);
    const dayInserts = calls.filter(([sql]) => sql.includes('INSERT INTO program_days'));
    expect(dayInserts[0][1]).toContain('push');
    expect(dayInserts[2][1]).toContain('legs');
  });

  it('rejects missing daily workouts before opening a transaction', async () => {
    const db = { withExclusiveTransactionAsync: vi.fn() } as unknown as SQLiteDatabase;
    await expect(createProgram(db, { name: 'My Program', description: null, difficulty: 'beginner', durationWeeks: 4, weeks: [{ weekNumber: 1, days: [] }, { weekNumber: 2, days: [] }, { weekNumber: 3, days: [] }, { weekNumber: 4, days: [] }] }))
      .rejects.toThrow('Choose between 1 and 7');
  });

  it('rejects a week count mismatch before opening a transaction', async () => {
    const db = { withExclusiveTransactionAsync: vi.fn() } as unknown as SQLiteDatabase;
    await expect(createProgram(db, { name: 'My Program', description: null, difficulty: 'beginner', durationWeeks: 2, weeks: [{ weekNumber: 1, days: [{ dayNumber: 1, dayLabel: 'Push', planId: 'push', workoutType: 'strength', estimatedDurationMinutes: null, notes: null }] }] }))
      .rejects.toThrow('Every week needs its own workout schedule.');
  });

  it('allows a different number of training days in each week', async () => {
    const runAsync = vi.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const transaction = { runAsync } as unknown as SQLiteDatabase;
    const db = {
      withExclusiveTransactionAsync: async (callback: (value: SQLiteDatabase) => Promise<void>) => callback(transaction),
      getFirstAsync: vi.fn(async () => ({
        id: 'program-1', name: 'My Program', description: null, category: 'My Programs', goal: null,
        difficulty: 'beginner', duration_weeks: 2, days_per_week: 3, estimated_session_minutes: null,
        equipment_level: null, is_builtin: 0, is_featured: 0, is_favorite: 0, is_archived: 0,
        version: 1, notes: null, created_at: '2026-01-01', updated_at: '2026-01-01',
      })),
      getAllAsync: vi.fn(async () => []),
    } as unknown as SQLiteDatabase;

    await createProgram(db, {
      name: 'My Program', description: null, difficulty: 'beginner', durationWeeks: 2,
      weeks: [
        { weekNumber: 1, days: [
          { dayNumber: 1, dayLabel: 'Full Body', planId: 'full-body', workoutType: 'strength', estimatedDurationMinutes: null, notes: null },
        ] },
        { weekNumber: 2, days: [
          { dayNumber: 1, dayLabel: 'Push', planId: 'push', workoutType: 'strength', estimatedDurationMinutes: null, notes: null },
          { dayNumber: 2, dayLabel: 'Pull', planId: 'pull', workoutType: 'strength', estimatedDurationMinutes: null, notes: null },
          { dayNumber: 3, dayLabel: 'Legs', planId: 'legs', workoutType: 'strength', estimatedDurationMinutes: null, notes: null },
        ] },
      ],
    });

    const calls = runAsync.mock.calls as unknown as [string, unknown[]][];
    expect(calls.filter(([sql]) => sql.includes('INSERT INTO program_days'))).toHaveLength(4);
    const templateInsert = calls.find(([sql]) => sql.includes('INSERT INTO program_templates'))!;
    expect(templateInsert[1]).toContain(3);
  });

  it('allows multiple workouts on the same day, ordered by their position in the list', async () => {
    const runAsync = vi.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const transaction = { runAsync } as unknown as SQLiteDatabase;
    const db = {
      withExclusiveTransactionAsync: async (callback: (value: SQLiteDatabase) => Promise<void>) => callback(transaction),
      getFirstAsync: vi.fn(async () => ({
        id: 'program-1', name: 'My Program', description: null, category: 'My Programs', goal: null,
        difficulty: 'beginner', duration_weeks: 1, days_per_week: 2, estimated_session_minutes: null,
        equipment_level: null, is_builtin: 0, is_featured: 0, is_favorite: 0, is_archived: 0,
        version: 1, notes: null, created_at: '2026-01-01', updated_at: '2026-01-01',
      })),
      getAllAsync: vi.fn(async () => []),
    } as unknown as SQLiteDatabase;

    await createProgram(db, {
      name: 'My Program', description: null, difficulty: 'beginner', durationWeeks: 1,
      weeks: [{ weekNumber: 1, days: [
        { dayNumber: 1, dayLabel: 'Morning Run', planId: 'run', workoutType: 'running', estimatedDurationMinutes: null, notes: null },
        { dayNumber: 1, dayLabel: 'Evening Lift', planId: 'lift', workoutType: 'strength', estimatedDurationMinutes: null, notes: null },
        { dayNumber: 2, dayLabel: 'Rest Lift', planId: 'lift2', workoutType: 'strength', estimatedDurationMinutes: null, notes: null },
      ] }],
    });

    const dayInserts = (runAsync.mock.calls as unknown as [string, unknown[]][]).filter(([sql]) => sql.includes('INSERT INTO program_days'));
    expect(dayInserts).toHaveLength(3);
    // params: [id, weekId, dayNumber, dayLabel, planId, workoutType, notes, displayOrder, ...] — displayOrder
    // should reflect list position, not day_number, so same-day entries stay in their intended order.
    expect(dayInserts[0][1][2]).toBe(1); expect(dayInserts[0][1][7]).toBe(0);
    expect(dayInserts[1][1][2]).toBe(1); expect(dayInserts[1][1][7]).toBe(1);
    expect(dayInserts[2][1][2]).toBe(2); expect(dayInserts[2][1][7]).toBe(2);
  });
});

describe('updateProgram', () => {
  const validInput = {
    name: 'Updated Program', description: null, difficulty: 'intermediate' as const, durationWeeks: 1,
    weeks: [{ weekNumber: 1, days: [{ dayNumber: 1, dayLabel: 'Push', planId: 'push', workoutType: 'strength' as const, estimatedDurationMinutes: null, notes: null }] }],
  };

  it('replaces every week and day for a user-created program', async () => {
    const runAsync = vi.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const transaction = { runAsync } as unknown as SQLiteDatabase;
    const getFirstAsync = vi.fn(async (sql: string) => sql.includes('SELECT is_builtin')
      ? { is_builtin: 0 }
      : { id: 'program-1', name: 'Updated Program', description: null, category: 'My Programs', goal: null,
        difficulty: 'intermediate', duration_weeks: 1, days_per_week: 1, estimated_session_minutes: null,
        equipment_level: null, is_builtin: 0, is_featured: 0, is_favorite: 0, is_archived: 0,
        version: 1, notes: null, created_at: '2026-01-01', updated_at: '2026-01-02' });
    const db = {
      withExclusiveTransactionAsync: async (callback: (value: SQLiteDatabase) => Promise<void>) => callback(transaction),
      getFirstAsync, getAllAsync: vi.fn(async () => []),
    } as unknown as SQLiteDatabase;

    const result = await updateProgram(db, 'program-1', validInput);

    expect(result.name).toBe('Updated Program');
    const calls = runAsync.mock.calls as unknown as [string, unknown[]][];
    expect(calls.filter(([sql]) => sql.includes('UPDATE program_templates'))).toHaveLength(1);
    expect(calls.filter(([sql]) => sql.includes('DELETE FROM program_weeks'))).toHaveLength(1);
    expect(calls.filter(([sql]) => sql.includes('INSERT INTO program_weeks'))).toHaveLength(1);
    expect(calls.filter(([sql]) => sql.includes('INSERT INTO program_days'))).toHaveLength(1);
  });

  it('rejects editing a built-in program', async () => {
    const db = {
      getFirstAsync: vi.fn(async () => ({ is_builtin: 1 })),
      withExclusiveTransactionAsync: vi.fn(),
    } as unknown as SQLiteDatabase;
    await expect(updateProgram(db, 'program-shiva', validInput)).rejects.toThrow('Built-in programs cannot be edited.');
  });

  it('rejects editing a program that no longer exists', async () => {
    const db = { getFirstAsync: vi.fn(async () => null), withExclusiveTransactionAsync: vi.fn() } as unknown as SQLiteDatabase;
    await expect(updateProgram(db, 'missing', validInput)).rejects.toThrow('This program could not be found.');
  });
});

describe('deleteProgram', () => {
  it('deletes a user-created program', async () => {
    const runAsync = vi.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const db = { getFirstAsync: vi.fn(async () => ({ is_builtin: 0 })), runAsync } as unknown as SQLiteDatabase;
    await deleteProgram(db, 'program-1');
    expect(runAsync).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM program_templates'), ['program-1']);
  });

  it('rejects deleting a built-in program', async () => {
    const db = { getFirstAsync: vi.fn(async () => ({ is_builtin: 1 })), runAsync: vi.fn() } as unknown as SQLiteDatabase;
    await expect(deleteProgram(db, 'program-shiva')).rejects.toThrow('Built-in programs cannot be deleted.');
  });

  it('does nothing when the program no longer exists', async () => {
    const runAsync = vi.fn();
    const db = { getFirstAsync: vi.fn(async () => null), runAsync } as unknown as SQLiteDatabase;
    await deleteProgram(db, 'missing');
    expect(runAsync).not.toHaveBeenCalled();
  });
});
