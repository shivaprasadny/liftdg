import { format } from 'date-fns';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Daypart, ScheduledWorkoutStatus } from '@/constants/scheduledWorkout';
import type { WorkoutPlanType } from '@/constants/workoutPlanTypes';
import { calculateProgramOccurrenceDate } from '@/services/scheduledWorkoutService';
import type { CancelProgramScheduleResult, ProgramScheduleBatch, ScheduledWorkout, ScheduleWorkoutInput, UpdateScheduledWorkoutInput } from '@/types/scheduledWorkout';
import { AppError, toAppError } from '@/utils/errors';
import { createId } from '@/utils/ids';

import { getProgramById } from './programRepository';
import { getPlanById } from './workoutPlanRepository';

interface Row {
  id: string; plan_id: string | null; scheduled_date: string; daypart: string | null; start_time: string | null;
  snapshot_name: string; snapshot_workout_type: string; estimated_duration_minutes: number | null;
  status: string; notes: string | null; program_id: string | null; program_week_number: number | null;
  program_day_id: string | null; created_at: string; updated_at: string;
  active_session_id: string | null; actual_started_at: string | null; snapshot_json: string | null;
}

function mapRow(row: Row): ScheduledWorkout {
  return {
    id: row.id, planId: row.plan_id, scheduledDate: row.scheduled_date, daypart: row.daypart as Daypart | null,
    startTime: row.start_time, snapshotName: row.snapshot_name, snapshotWorkoutType: row.snapshot_workout_type as WorkoutPlanType,
    estimatedDurationMinutes: row.estimated_duration_minutes, status: row.status as ScheduledWorkoutStatus,
    notes: row.notes, programId: row.program_id, programWeekNumber: row.program_week_number, programDayId: row.program_day_id,
    activeSessionId: row.active_session_id, actualStartedAt: row.actual_started_at, snapshotJson: row.snapshot_json,
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
       estimated_duration_minutes, status, notes, program_id, program_week_number, program_day_id, snapshot_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 'scheduled', ?, ?, ?, ?, ?, ?, ?)`,
    [id, plan.id, input.scheduledDate, input.daypart, input.startTime, plan.name, plan.workoutType, input.notes,
      input.programId ?? null, input.programWeekNumber ?? null, input.programDayId ?? null, JSON.stringify(plan), now, now]);
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
             estimated_duration_minutes, status, notes, program_id, program_week_number, program_day_id, snapshot_json, created_at, updated_at)
            VALUES (?, ?, ?, NULL, NULL, ?, ?, ?, 'scheduled', ?, ?, ?, ?, ?, ?, ?)`,
          [createId('scheduled_workout'), day.plan.id, scheduledDate, day.plan.name, day.plan.workoutType,
            day.estimatedDurationMinutes, day.notes, program.id, week.weekNumber, day.id, JSON.stringify(day.plan), now, now]);
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
    `SELECT * FROM scheduled_workouts
      WHERE scheduled_date >= ? AND scheduled_date <= ? AND status != 'cancelled'
      ORDER BY scheduled_date`,
    [fromDate, toDate],
  );
  return rows.map(mapRow);
}

export async function getScheduledWorkoutById(db: SQLiteDatabase, id: string): Promise<ScheduledWorkout | null> {
  const row = await db.getFirstAsync<Row>('SELECT * FROM scheduled_workouts WHERE id = ?', [id]);
  return row ? mapRow(row) : null;
}

export async function getScheduledWorkoutsForDate(db: SQLiteDatabase, localDate: string): Promise<ScheduledWorkout[]> {
  const rows = await db.getAllAsync<Row>(
    `SELECT * FROM scheduled_workouts
      WHERE scheduled_date = ? AND status != 'cancelled'
      ORDER BY created_at`,
    [localDate],
  );
  return rows.map(mapRow);
}

export async function getNextProgramWorkout(db: SQLiteDatabase, afterLocalDate: string): Promise<ScheduledWorkout | null> {
  const row = await db.getFirstAsync<Row>(`SELECT * FROM scheduled_workouts WHERE program_id IS NOT NULL
    AND scheduled_date > ? AND status = 'scheduled' ORDER BY scheduled_date, COALESCE(start_time, '99:99'), created_at LIMIT 1`, [afterLocalDate]);
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

/** One `startProgram` transaction uses one created_at value, which is the stable batch identity in the current no-ActiveProgram architecture. */
export async function getProgramScheduleBatches(db: SQLiteDatabase, programId: string): Promise<ProgramScheduleBatch[]> {
  const localToday = format(new Date(), 'yyyy-MM-dd');
  const rows = await db.getAllAsync<{
    batch_created_at: string; start_date: string; end_date: string; total_count: number;
    eligible_count: number; completed_count: number; in_progress_count: number; cancelled_count: number;
  }>(`SELECT created_at AS batch_created_at,
      MIN(scheduled_date) AS start_date,
      MAX(scheduled_date) AS end_date,
      COUNT(*) AS total_count,
      SUM(CASE WHEN scheduled_date >= ? AND status IN ('scheduled','missed','skipped') THEN 1 ELSE 0 END) AS eligible_count,
      SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed_count,
      SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) AS in_progress_count,
      SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) AS cancelled_count
    FROM scheduled_workouts
    WHERE program_id=?
    GROUP BY created_at
    ORDER BY created_at DESC`, [localToday, programId]);
  return rows.map((row) => ({
    programId,
    batchCreatedAt: row.batch_created_at,
    startDate: row.start_date,
    endDate: row.end_date,
    totalCount: row.total_count,
    eligibleCount: row.eligible_count,
    completedCount: row.completed_count,
    inProgressCount: row.in_progress_count,
    cancelledCount: row.cancelled_count,
  }));
}

/** Cancels only today/future uncompleted occurrences; past calendar state and workout history are never changed. */
export async function cancelProgramSchedule(
  db: SQLiteDatabase,
  programId: string,
  batchCreatedAt: string,
): Promise<CancelProgramScheduleResult> {
  try {
    const localToday = format(new Date(), 'yyyy-MM-dd');
    let cancellationResult: CancelProgramScheduleResult | null = null;
    await db.withExclusiveTransactionAsync(async (transaction) => {
      const counts = await transaction.getFirstAsync<{ completed_count: number; in_progress_count: number }>(
        `SELECT SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed_count,
          SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) AS in_progress_count
        FROM scheduled_workouts WHERE program_id=? AND created_at=?`,
        [programId, batchCreatedAt],
      );
      const result = await transaction.runAsync(
        `UPDATE scheduled_workouts
        SET status='cancelled', active_session_id=NULL, updated_at=?
        WHERE program_id=? AND created_at=? AND scheduled_date>=?
          AND status IN ('scheduled','missed','skipped')`,
        [new Date().toISOString(), programId, batchCreatedAt, localToday],
      );
      cancellationResult = {
        cancelledCount: result.changes,
        preservedCompletedCount: counts?.completed_count ?? 0,
        preservedInProgressCount: counts?.in_progress_count ?? 0,
      };
    });
    if (!cancellationResult) throw new AppError('Could not confirm the program cancellation.');
    return cancellationResult;
  } catch (error) {
    throw toAppError(error, 'Could not cancel this program schedule.');
  }
}
