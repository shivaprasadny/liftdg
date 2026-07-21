import type { SQLiteDatabase } from 'expo-sqlite';

import type { PersonalRecord, PersonalRecordCandidate, PersonalRecordFilter, PersonalRecordType } from '@/types/personalRecord';
import { createId } from '@/utils/ids';

interface PersonalRecordRow {
  id: string; exercise_id: string; exercise_name: string; workout_id: string;
  workout_set_id: string | null; record_type: PersonalRecordType; value: number;
  secondary_value: number | null; achieved_at: string; created_at: string; updated_at: string;
}

const baseSelect = `SELECT pr.*, e.name AS exercise_name FROM personal_records pr
  JOIN exercises e ON e.id = pr.exercise_id`;

function mapRecord(row: PersonalRecordRow): PersonalRecord {
  return {
    id: row.id, exerciseId: row.exercise_id, exerciseName: row.exercise_name, workoutId: row.workout_id,
    workoutSetId: row.workout_set_id, recordType: row.record_type, value: row.value,
    secondaryValue: row.secondary_value, achievedAt: row.achieved_at, createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function filterQuery(filter: PersonalRecordFilter): { where: string; params: (string | number)[] } {
  const conditions: string[] = []; const params: (string | number)[] = [];
  if (filter.exerciseId) { conditions.push('pr.exercise_id = ?'); params.push(filter.exerciseId); }
  if (filter.recordType) { conditions.push('pr.record_type = ?'); params.push(filter.recordType); }
  if (filter.from) { conditions.push('pr.achieved_at >= ?'); params.push(filter.from); }
  if (filter.to) { conditions.push('pr.achieved_at <= ?'); params.push(filter.to); }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

export async function getAllPersonalRecords(
  db: SQLiteDatabase, filter: PersonalRecordFilter = {},
): Promise<PersonalRecord[]> {
  const { where, params } = filterQuery(filter);
  const rows = await db.getAllAsync<PersonalRecordRow>(
    `${baseSelect} ${where} ORDER BY pr.achieved_at DESC`, params,
  );
  return rows.map(mapRecord);
}

export async function getRecentPersonalRecords(db: SQLiteDatabase, limit = 5): Promise<PersonalRecord[]> {
  const rows = await db.getAllAsync<PersonalRecordRow>(
    `${baseSelect} ORDER BY pr.achieved_at DESC LIMIT ?`, [limit],
  );
  return rows.map(mapRecord);
}

export async function getRecordsForExercise(db: SQLiteDatabase, exerciseId: string): Promise<PersonalRecord[]> {
  const rows = await db.getAllAsync<PersonalRecordRow>(
    `${baseSelect} WHERE pr.exercise_id = ? ORDER BY pr.record_type, pr.achieved_at DESC`, [exerciseId],
  );
  return rows.map(mapRecord);
}

export async function getBestRecordForExercise(
  db: SQLiteDatabase, exerciseId: string, recordType: PersonalRecordType,
): Promise<PersonalRecord | null> {
  const row = await db.getFirstAsync<PersonalRecordRow>(
    `${baseSelect} WHERE pr.exercise_id = ? AND pr.record_type = ? ORDER BY pr.value DESC LIMIT 1`,
    [exerciseId, recordType],
  );
  return row ? mapRecord(row) : null;
}

/** Records confirmed for one workout, for the "New Personal Record" badge shown on its summary/details. */
export async function getRecordsForWorkout(db: SQLiteDatabase, workoutId: string): Promise<PersonalRecord[]> {
  const rows = await db.getAllAsync<PersonalRecordRow>(
    `${baseSelect} WHERE pr.workout_id = ? ORDER BY pr.record_type`, [workoutId],
  );
  return rows.map(mapRecord);
}

/** Exact-match dedup check for the (exercise, type, value, workout) tuple the unique index enforces. */
export async function recordExists(db: SQLiteDatabase, candidate: PersonalRecordCandidate): Promise<boolean> {
  const row = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM personal_records
     WHERE exercise_id = ? AND record_type = ? AND value = ? AND workout_id = ?`,
    [candidate.exerciseId, candidate.recordType, candidate.value, candidate.workoutId],
  );
  return Boolean(row);
}

export async function insertPersonalRecord(
  db: SQLiteDatabase, candidate: PersonalRecordCandidate,
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO personal_records
      (id, exercise_id, workout_id, workout_set_id, record_type, value, secondary_value, achieved_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(exercise_id, record_type, value, workout_id) DO NOTHING`,
    [createId('personal_record'), candidate.exerciseId, candidate.workoutId, candidate.workoutSetId,
      candidate.recordType, candidate.value, candidate.secondaryValue, candidate.achievedAt, now, now],
  );
}

export async function deleteRecordsForWorkout(db: SQLiteDatabase, workoutId: string): Promise<void> {
  await db.runAsync('DELETE FROM personal_records WHERE workout_id = ?', [workoutId]);
}

export async function deleteRecordsForExercise(db: SQLiteDatabase, exerciseId: string): Promise<void> {
  await db.runAsync('DELETE FROM personal_records WHERE exercise_id = ?', [exerciseId]);
}

export async function getPersonalRecordCount(db: SQLiteDatabase, filter: PersonalRecordFilter = {}): Promise<number> {
  const { where, params } = filterQuery(filter);
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM personal_records pr ${where}`, params,
  );
  return row?.count ?? 0;
}

/** Distinct exercise IDs that currently hold at least one record; used to scope recalculation. */
export async function getExerciseIdsWithRecords(db: SQLiteDatabase): Promise<string[]> {
  const rows = await db.getAllAsync<{ exercise_id: string }>('SELECT DISTINCT exercise_id FROM personal_records');
  return rows.map((row) => row.exercise_id);
}
