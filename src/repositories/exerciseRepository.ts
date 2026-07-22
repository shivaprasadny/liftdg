import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  CreateExerciseInput, Exercise, ExerciseFilters, ExercisePerformance,
} from '@/types/exercise';
import { createId } from '@/utils/ids';

interface ExerciseRow {
  id: string; name: string; category: Exercise['category']; primary_muscles: string | null;
  secondary_muscles: string | null; equipment: Exercise['equipment'];
  exercise_type: Exercise['exerciseType']; instructions: string | null;
  is_builtin: number; is_archived: number; created_at: string; updated_at: string;
  movement_pattern?: string | null; difficulty?: Exercise['difficulty']; exercise_role?: string | null;
  laterality?: Exercise['laterality']; loading_style?: string | null;
}

function parseArray(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : [];
  } catch { return []; }
}

function mapExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id, name: row.name, category: row.category,
    primaryMuscles: parseArray(row.primary_muscles), secondaryMuscles: parseArray(row.secondary_muscles),
    equipment: row.equipment, exerciseType: row.exercise_type,
    instructions: parseArray(row.instructions), isBuiltin: row.is_builtin === 1,
    isArchived: row.is_archived === 1, createdAt: row.created_at, updatedAt: row.updated_at,
    movementPattern: row.movement_pattern ?? null, difficulty: row.difficulty ?? null,
    exerciseRole: row.exercise_role ?? null, laterality: row.laterality ?? null,
    loadingStyle: row.loading_style ?? null,
  };
}

export async function listExercises(db: SQLiteDatabase, filters: ExerciseFilters = {}): Promise<Exercise[]> {
  const conditions = ['is_archived = 0'];
  const params: (string | number)[] = [];
  if (filters.search?.trim()) {
    conditions.push('name LIKE ?');
    params.push(`%${filters.search.trim()}%`);
  }
  if (filters.category) { conditions.push('category = ?'); params.push(filters.category); }
  if (filters.equipment) { conditions.push('equipment = ?'); params.push(filters.equipment); }
  if (filters.exerciseType) { conditions.push('exercise_type = ?'); params.push(filters.exerciseType); }
  const rows = await db.getAllAsync<ExerciseRow>(
    `SELECT * FROM exercises WHERE ${conditions.join(' AND ')} ORDER BY name COLLATE NOCASE`, params,
  );
  return rows.map(mapExercise);
}

export async function getExerciseById(db: SQLiteDatabase, id: string): Promise<Exercise | null> {
  return mapNullable(await db.getFirstAsync<ExerciseRow>('SELECT * FROM exercises WHERE id = ?', [id]));
}

function mapNullable(row: ExerciseRow | null): Exercise | null { return row ? mapExercise(row) : null; }

export async function findExerciseByName(
  db: SQLiteDatabase, name: string, excludingId?: string,
): Promise<Exercise | null> {
  const query = excludingId
    ? 'SELECT * FROM exercises WHERE lower(name) = lower(?) AND id != ? AND is_archived = 0 LIMIT 1'
    : 'SELECT * FROM exercises WHERE lower(name) = lower(?) AND is_archived = 0 LIMIT 1';
  const params = excludingId ? [name.trim(), excludingId] : [name.trim()];
  return mapNullable(await db.getFirstAsync<ExerciseRow>(query, params));
}

export async function updateExercise(
  db: SQLiteDatabase, id: string, input: CreateExerciseInput,
): Promise<Exercise> {
  const result = await db.runAsync(
    `UPDATE exercises SET name = ?, category = ?, primary_muscles = ?, secondary_muscles = ?,
      equipment = ?, exercise_type = ?, instructions = ?, updated_at = ?
     WHERE id = ? AND is_builtin = 0 AND is_archived = 0`,
    [input.name.trim(), input.category, JSON.stringify(input.primaryMuscles),
      JSON.stringify(input.secondaryMuscles), input.equipment, input.exerciseType,
      JSON.stringify(input.instructions), new Date().toISOString(), id],
  );
  if (result.changes !== 1) throw new Error('Only active custom exercises can be edited');
  const updated = await getExerciseById(db, id);
  if (!updated) throw new Error('Exercise was not found after update');
  return updated;
}

export async function createExercise(db: SQLiteDatabase, input: CreateExerciseInput): Promise<Exercise> {
  const id = createId('exercise');
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO exercises (
      id, name, category, primary_muscles, secondary_muscles, equipment, exercise_type,
      instructions, is_builtin, is_archived, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
    [id, input.name.trim(), input.category, JSON.stringify(input.primaryMuscles),
      JSON.stringify(input.secondaryMuscles), input.equipment, input.exerciseType,
      JSON.stringify(input.instructions), now, now],
  );
  const created = await getExerciseById(db, id);
  if (!created) throw new Error('Exercise was not created');
  return created;
}

export async function archiveExercise(db: SQLiteDatabase, id: string): Promise<void> {
  const result = await db.runAsync(
    'UPDATE exercises SET is_archived = 1, updated_at = ? WHERE id = ? AND is_builtin = 0',
    [new Date().toISOString(), id],
  );
  if (result.changes !== 1) throw new Error('Built-in exercises cannot be archived');
}

export async function getExercisePerformance(
  db: SQLiteDatabase, exerciseId: string,
): Promise<ExercisePerformance> {
  const best = await db.getFirstAsync<{ best_weight: number | null; best_volume: number | null }>(`
    SELECT MAX(ws.weight) AS best_weight, MAX(ws.weight * ws.reps) AS best_volume
    FROM workout_sets ws JOIN workout_exercises we ON we.id = ws.workout_exercise_id
    WHERE we.exercise_id = ? AND ws.completed = 1`, [exerciseId]);
  const bestSet = await db.getFirstAsync<{ weight: number; reps: number }>(`
    SELECT ws.weight, ws.reps FROM workout_sets ws
    JOIN workout_exercises we ON we.id = ws.workout_exercise_id
    WHERE we.exercise_id = ? AND ws.completed = 1 AND ws.weight IS NOT NULL AND ws.reps IS NOT NULL
    ORDER BY (ws.weight * ws.reps) DESC LIMIT 1`, [exerciseId]);
  const oneRep = await db.getFirstAsync<{ value: number | null }>(`
    SELECT MAX(ws.weight * (1 + ws.reps / 30.0)) AS value FROM workout_sets ws
    JOIN workout_exercises we ON we.id = ws.workout_exercise_id
    WHERE we.exercise_id = ? AND ws.completed = 1 AND ws.weight > 0 AND ws.reps BETWEEN 1 AND 15`, [exerciseId]);
  const dates = await db.getAllAsync<{ started_at: string }>(`
    SELECT DISTINCT w.started_at FROM workouts w
    JOIN workout_exercises we ON we.workout_id = w.id
    WHERE we.exercise_id = ? AND w.status = 'completed'
    ORDER BY w.started_at DESC LIMIT 5`, [exerciseId]);
  return {
    bestWeightKg: best?.best_weight ?? null,
    bestSet: bestSet ? { weightKg: bestSet.weight, reps: bestSet.reps } : null,
    estimatedOneRepMaxKg: oneRep?.value ?? null,
    recentWorkoutDates: dates.map((row) => row.started_at),
  };
}
