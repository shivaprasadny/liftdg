import type { SQLiteDatabase } from 'expo-sqlite';

import type { Daypart, ScheduledWorkoutStatus } from '@/constants/scheduledWorkout';
import type { WorkoutPlanType } from '@/constants/workoutPlanTypes';
import { calculateProgramOccurrenceDate } from '@/services/scheduledWorkoutService';
import type { ScheduledWorkout, ScheduleWorkoutInput, UpdateScheduledWorkoutInput } from '@/types/scheduledWorkout';
import { AppError, toAppError } from '@/utils/errors';
import { createId } from '@/utils/ids';

import { getProgramById } from './programRepository';
import { getPlanById } from './workoutPlanRepository';

interface Row {
  id: string; plan_id: string | null; scheduled_date: string; daypart: string | null; start_time: string | null;
  snapshot_name: string; snapshot_workout_type: string; estimated_duration_minutes: number | null;
  status: string; notes: string | null; program_id: string | null; program_week_number: number | null;
  program_day_id: string | null; created_at: string; updated_at: string;
}

function mapRow(row: Row): ScheduledWorkout {
  return {
    id: row.id, planId: row.plan_id, scheduledDate: row.scheduled_date, daypart: row.daypart as Daypart | null,
    startTime: row.start_time, snapshotName: row.snapshot_name, snapshotWorkoutType: row.snapshot_workout_type as WorkoutPlanType,
    estimatedDurationMinutes: row.estimated_duration_minutes, status: row.status as ScheduledWorkoutStatus,
    notes: row.notes, programId: row.program_id, programWeekNumber: row.program_week_number, programDayId: row.program_day_id,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

/** Snapshots the plan's name/type at schedule time (DECISIONS.md #46) so a later plan edit never rewrites what was already scheduled. */
export async function scheduleWorkout(db: SQLiteDatabase, input: ScheduleWorkoutInput): Promise<ScheduledWorkout> {
  const plan = await getPlanById(db, input.planId);
  if (!plan) throw new AppError('Could not find that workout to schedule.');
  const id = createId('scheduled_workout'); const now = new Date().toISOString();
  try {
    await db.runAsync(`INSERT INTO scheduled_workouts
      (id, plan_id, scheduled_date, daypart, start_time, snapshot_name, snapshot_workout_type,
       estimated_duration_minutes, status, notes, program_id, program_week_number, program_day_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'scheduled', ?, ?, ?, ?, ?, ?)`,
    [id, plan.id, input.scheduledDate, input.daypart, input.startTime, plan.name, plan.workoutType, input.notes,
      input.programId ?? null, input.programWeekNumber ?? null, input.programDayId ?? null, now, now]);
  } catch (error) { throw toAppError(error, 'Could not schedule this workout.'); }
  const row = await db.getFirstAsync<Row>('SELECT * FROM scheduled_workouts WHERE id = ?', [id]);
  if (!row) throw new AppError('Scheduled workout was not created.');
  return mapRow(row);
}

/**
 * "Start Program" (DECISIONS.md #47): bulk-creates one scheduled_workouts row per non-rest program
 * day, in one transaction. No conflict detection, no weekday preferences, no ActiveProgram record —
 * tapping this twice for the same program creates a second full set of occurrences, same as
 * scheduling the same plan twice manually would.
 */
export async function startProgram(db: SQLiteDatabase, programId: string, startDateIso: string): Promise<number> {
  const program = await getProgramById(db, programId);
  if (!program) throw new AppError('Could not find that program to start.');
  const now = new Date().toISOString();
  let created = 0;
  try {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      for (const week of program.weeks) {
        for (const day of week.days) {
          if (day.isRestDay || !day.planId || !day.plan) continue;
          const scheduledDate = calculateProgramOccurrenceDate(startDateIso, week.weekNumber, day.dayNumber);
          await transaction.runAsync(`INSERT INTO scheduled_workouts
            (id, plan_id, scheduled_date, daypart, start_time, snapshot_name, snapshot_workout_type,
             estimated_duration_minutes, status, notes, program_id, program_week_number, program_day_id, created_at, updated_at)
            VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?, ?)`,
          [createId('scheduled_workout'), day.plan.id, scheduledDate, day.plan.name, day.plan.workoutType,
            day.estimatedDurationMinutes, day.notes, program.id, week.weekNumber, day.id, now, now]);
          created += 1;
        }
      }
    });
  } catch (error) { throw toAppError(error, 'Could not start this program.'); }
  return created;
}

/** Inclusive date range, ordered by date only — same-day ordering (time/daypart) is a display concern, see scheduledWorkoutService. */
export async function getScheduledWorkoutsInRange(db: SQLiteDatabase, fromDate: string, toDate: string): Promise<ScheduledWorkout[]> {
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM scheduled_workouts WHERE scheduled_date >= ? AND scheduled_date <= ? ORDER BY scheduled_date',
    [fromDate, toDate],
  );
  return rows.map(mapRow);
}

export async function getScheduledWorkoutById(db: SQLiteDatabase, id: string): Promise<ScheduledWorkout | null> {
  const row = await db.getFirstAsync<Row>('SELECT * FROM scheduled_workouts WHERE id = ?', [id]);
  return row ? mapRow(row) : null;
}

/** "Only This Workout" scope — the only scope that exists yet (DECISIONS.md #47): a plain update of the one row. */
export async function updateScheduledWorkout(db: SQLiteDatabase, id: string, input: UpdateScheduledWorkoutInput): Promise<ScheduledWorkout> {
  const result = await db.runAsync(
    'UPDATE scheduled_workouts SET scheduled_date = ?, daypart = ?, notes = ?, updated_at = ? WHERE id = ?',
    [input.scheduledDate, input.daypart, input.notes, new Date().toISOString(), id],
  );
  if (result.changes !== 1) throw new AppError('Scheduled workout not found.');
  const row = await db.getFirstAsync<Row>('SELECT * FROM scheduled_workouts WHERE id = ?', [id]);
  if (!row) throw new AppError('Scheduled workout not found.');
  return mapRow(row);
}

export async function deleteScheduledWorkout(db: SQLiteDatabase, id: string): Promise<void> {
  const result = await db.runAsync('DELETE FROM scheduled_workouts WHERE id = ?', [id]);
  if (result.changes !== 1) throw new AppError('Scheduled workout not found.');
}
