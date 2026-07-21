import type { SQLiteDatabase } from 'expo-sqlite';

import { dateBoundsForPreset, buildRepeatedWorkoutSnapshot, calculateCompletedWorkoutTiming, derivePlanExerciseTarget } from '../services/workoutHistoryService';
import { deriveWorkoutType } from '../services/cardioService';
import { assertCanStartWorkout, buildWorkoutSnapshot, elapsedSeconds, removeWorkoutExerciseId, summarizeWorkout } from '../services/workoutService';
import { copyPlanGroupsToWorkout } from './planGroupRepository';
import { getCardioSessionsByWorkout } from './cardioRepository';
import { getGroupsForWorkout } from './workoutGroupRepository';
import { recalculateRecordsForExercises } from '@/services/personalRecordService';
import type { Exercise } from '@/types/exercise';
import type { ActiveWorkout, PreviousExercisePerformance, SetType, UpdateCompletedWorkoutInput, Workout, WorkoutDetails, WorkoutExercise, WorkoutHistoryFilter, WorkoutHistoryItem, WorkoutHistorySort, WorkoutSet, WorkoutSetUpdate, WorkoutSummary } from '@/types/workout';
import type { WorkoutPlanWithExercises } from '@/types/workoutPlan';
import { AppError, toAppError } from '../utils/errors'; import { createId } from '../utils/ids';

interface WorkoutRow { id: string; plan_id: string | null; name: string; workout_type: Workout['workoutType']; started_at: string; completed_at: string | null; duration_seconds: number | null; notes: string | null; status: Workout['status']; created_at: string; updated_at: string; }
interface ExerciseRow { id: string; workout_id: string; exercise_id: string; exercise_order: number; target_sets: number | null; target_reps_min: number | null; target_reps_max: number | null; target_weight: number | null; rest_seconds: number | null; notes: string | null; started_at: string | null; completed_at: string | null; name: string; category: Exercise['category']; primary_muscles: string | null; secondary_muscles: string | null; equipment: Exercise['equipment']; exercise_type: Exercise['exerciseType']; instructions: string | null; is_builtin: number; is_archived: number; exercise_created_at: string; exercise_updated_at: string; }
interface SetRow { id:string;workout_exercise_id:string;set_number:number;weight:number|null;reps:number|null;duration_seconds:number|null;distance:number|null;set_type:SetType;rpe:number|null;completed:number;completed_at:string|null;notes:string|null;created_at:string|null;updated_at:string|null;group_id:string|null;group_type:string|null;group_order:number|null;stage_number:number|null;assistance_weight:number|null;bodyweight_value:number|null;added_weight:number|null;round_number:number|null;target_duration_seconds:number|null;target_distance:number|null;is_amrap:number; }
interface HistoryRow extends WorkoutRow { plan_name:string|null;exercise_count:number;completed_set_count:number;total_repetitions:number;total_volume:number;cardio_duration_seconds:number;cardio_distance_km:number; }
const parse = (value: string | null): string[] => { if (!value) return []; try { const parsed: unknown = JSON.parse(value); return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []; } catch { return []; } };
const mapWorkout = (row: WorkoutRow): Workout => ({ id: row.id, planId: row.plan_id, name: row.name, workoutType: row.workout_type, startedAt: row.started_at, completedAt: row.completed_at, durationSeconds: row.duration_seconds, notes: row.notes, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at });
const mapSet = (row:SetRow):WorkoutSet=>({id:row.id,workoutExerciseId:row.workout_exercise_id,setNumber:row.set_number,weight:row.weight,reps:row.reps,durationSeconds:row.duration_seconds,distance:row.distance,setType:row.set_type,rpe:row.rpe,completed:row.completed===1,groupId:row.group_id,groupType:row.group_type,groupOrder:row.group_order,stageNumber:row.stage_number,assistanceWeight:row.assistance_weight,bodyweightValue:row.bodyweight_value,addedWeight:row.added_weight,roundNumber:row.round_number,targetDurationSeconds:row.target_duration_seconds,targetDistance:row.target_distance,isAmrap:row.is_amrap===1,completedAt:row.completed_at,notes:row.notes,createdAt:row.created_at??row.completed_at??'',updatedAt:row.updated_at??row.completed_at??''});

async function hydrateWorkout(db: SQLiteDatabase, row: WorkoutRow): Promise<ActiveWorkout> {
  const exerciseRows = await db.getAllAsync<ExerciseRow>(`SELECT we.*, e.name, e.category, e.primary_muscles, e.secondary_muscles,
    e.equipment, e.exercise_type, e.instructions, e.is_builtin, e.is_archived,
    e.created_at AS exercise_created_at, e.updated_at AS exercise_updated_at
    FROM workout_exercises we JOIN exercises e ON e.id = we.exercise_id
    WHERE we.workout_id = ? ORDER BY we.exercise_order`, [row.id]);
  const exercises: WorkoutExercise[] = [];
  for (const item of exerciseRows) {
    const sets = (await db.getAllAsync<SetRow>('SELECT * FROM workout_sets WHERE workout_exercise_id = ? ORDER BY set_number', [item.id])).map(mapSet);
    exercises.push({ id: item.id, workoutId: item.workout_id, exerciseId: item.exercise_id, exerciseOrder: item.exercise_order,
      targetSets: item.target_sets, targetRepsMin: item.target_reps_min, targetRepsMax: item.target_reps_max,
      targetWeight: item.target_weight, restSeconds: item.rest_seconds, notes: item.notes, startedAt: item.started_at, completedAt: item.completed_at,
      sets, exercise: { id: item.exercise_id, name: item.name, category: item.category, primaryMuscles: parse(item.primary_muscles), secondaryMuscles: parse(item.secondary_muscles), equipment: item.equipment, exerciseType: item.exercise_type, instructions: parse(item.instructions), isBuiltin: item.is_builtin === 1, isArchived: item.is_archived === 1, createdAt: item.exercise_created_at, updatedAt: item.exercise_updated_at } });
  }
  return { ...mapWorkout(row), exercises };
}

export async function getActiveWorkout(db: SQLiteDatabase): Promise<ActiveWorkout | null> {
  const row = await db.getFirstAsync<WorkoutRow>("SELECT * FROM workouts WHERE status = 'active' LIMIT 1"); return row ? hydrateWorkout(db, row) : null;
}
export async function getWorkoutById(db: SQLiteDatabase, id: string): Promise<ActiveWorkout | null> {
  const row = await db.getFirstAsync<WorkoutRow>('SELECT * FROM workouts WHERE id = ?', [id]); return row ? hydrateWorkout(db, row) : null;
}

async function assertNoActive(transaction: SQLiteDatabase): Promise<void> {
  const active = await transaction.getFirstAsync<{ id: string }>("SELECT id FROM workouts WHERE status = 'active' LIMIT 1");
  assertCanStartWorkout(active?.id ?? null);
}

/** Creates the workout, target snapshots, and initial sets atomically. */
export async function createWorkoutFromPlan(db: SQLiteDatabase, plan: WorkoutPlanWithExercises): Promise<string> {
  const workoutId = createId('workout'); const now = new Date().toISOString(); const snapshot = buildWorkoutSnapshot(plan);
  try { await db.withExclusiveTransactionAsync(async (transaction) => { await assertNoActive(transaction);
    await transaction.runAsync(`INSERT INTO workouts (id, plan_id, name, workout_type, started_at, status, created_at, updated_at)
      VALUES (?, ?, ?, 'strength', ?, 'active', ?, ?)`, [workoutId, plan.id, plan.name, now, now, now]);
    const groupIdMap = new Map<string, string>();
    for (const [snapshotIndex, item] of snapshot.entries()) { groupIdMap.set(plan.exercises[snapshotIndex].id, item.id); await transaction.runAsync(`INSERT INTO workout_exercises
      (id, workout_id, exercise_id, exercise_order, target_sets, target_reps_min, target_reps_max, target_weight, rest_seconds, notes, started_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [item.id, workoutId, item.exerciseId, item.exerciseOrder, item.targetSets, item.targetRepsMin, item.targetRepsMax, item.targetWeight, item.restSeconds, item.notes, now]);
      for (const [index, setId] of item.setIds.entries()) await transaction.runAsync(`INSERT INTO workout_sets
        (id, workout_exercise_id, set_number, weight, reps, set_type, completed, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'working', 0, ?, ?)`, [setId, item.id, index + 1, item.targetWeight, item.targetRepsMin, now, now]); }
    await copyPlanGroupsToWorkout(transaction, plan.id, workoutId, groupIdMap);
  }); return workoutId; } catch (error) { throw toAppError(error, 'Could not start this workout.'); }
}

export async function createEmptyWorkout(db: SQLiteDatabase, name: string): Promise<string> {
  const trimmed = name.trim(); if (trimmed.length < 2) throw new AppError('Workout name must be at least 2 characters.');
  const id = createId('workout'); const now = new Date().toISOString();
  try { await db.withExclusiveTransactionAsync(async (transaction) => { await assertNoActive(transaction);
    await transaction.runAsync(`INSERT INTO workouts (id, name, workout_type, started_at, status, created_at, updated_at)
      VALUES (?, ?, 'strength', ?, 'active', ?, ?)`, [id, trimmed, now, now, now]); }); return id;
  } catch (error) { throw toAppError(error, 'Could not start an empty workout.'); }
}

export async function addExercisesToWorkout(db: SQLiteDatabase, workoutId: string, exerciseIds: string[]): Promise<void> {
  const now = new Date().toISOString(); await db.withExclusiveTransactionAsync(async (transaction) => {
    const count = await transaction.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM workout_exercises WHERE workout_id = ?', [workoutId]); let order = count?.count ?? 0;
    for (const exerciseId of exerciseIds) { const exists = await transaction.getFirstAsync('SELECT id FROM workout_exercises WHERE workout_id = ? AND exercise_id = ?', [workoutId, exerciseId]); if (exists) continue;
      const linkId = createId('workout_exercise'); await transaction.runAsync(`INSERT INTO workout_exercises
        (id, workout_id, exercise_id, exercise_order, target_sets, target_reps_min, target_reps_max, rest_seconds, started_at)
        VALUES (?, ?, ?, ?, 3, 8, 12, 90, ?)`, [linkId, workoutId, exerciseId, order++, now]);
      for (let set = 1; set <= 3; set++) await transaction.runAsync(`INSERT INTO workout_sets
        (id, workout_exercise_id, set_number, set_type, completed, created_at, updated_at) VALUES (?, ?, ?, 'working', 0, ?, ?)`, [createId('workout_set'), linkId, set, now, now]); }
    await transaction.runAsync('UPDATE workouts SET updated_at = ? WHERE id = ?', [now, workoutId]);
  });
}

export async function updateWorkoutSet(db: SQLiteDatabase, id: string, value: WorkoutSetUpdate): Promise<void> {
  const now=new Date().toISOString();await db.runAsync(`UPDATE workout_sets SET weight=?,reps=?,duration_seconds=?,distance=?,set_type=?,rpe=?,completed=?,completed_at=?,notes=?,updated_at=?,group_id=?,group_type=?,group_order=?,stage_number=?,assistance_weight=?,bodyweight_value=?,added_weight=?,round_number=?,target_duration_seconds=?,target_distance=?,is_amrap=? WHERE id=?`,[value.weight,value.reps,value.durationSeconds??null,value.distance??null,value.setType,value.rpe,value.completed?1:0,value.completed?now:null,value.notes,now,value.groupId??null,value.groupType??null,value.groupOrder??null,value.stageNumber??null,value.assistanceWeight??null,value.bodyweightValue??null,value.addedWeight??null,value.roundNumber??null,value.targetDurationSeconds??null,value.targetDistance??null,value.isAmrap?1:0,id]);
}
/** Persists top-level notes without leaving the only copy in React memory. */
export async function updateWorkoutNotes(db: SQLiteDatabase, workoutId: string, notes: string | null): Promise<void> {
  await db.runAsync('UPDATE workouts SET notes = ?, updated_at = ? WHERE id = ?', [notes, new Date().toISOString(), workoutId]);
}
export async function addWorkoutSet(db: SQLiteDatabase, workoutExerciseId: string, copy?: WorkoutSet): Promise<void> {
  const row = await db.getFirstAsync<{ next: number }>('SELECT COALESCE(MAX(set_number), 0) + 1 AS next FROM workout_sets WHERE workout_exercise_id = ?', [workoutExerciseId]); const now = new Date().toISOString();
  await db.runAsync(`INSERT INTO workout_sets (id, workout_exercise_id, set_number, weight, reps, set_type, rpe, completed, notes, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`, [createId('workout_set'), workoutExerciseId, row?.next ?? 1, copy?.weight ?? null, copy?.reps ?? null, copy?.setType ?? 'working', copy?.rpe ?? null, copy?.notes ?? null, now, now]);
}
export async function deleteWorkoutSet(db: SQLiteDatabase, id: string): Promise<void> { await db.runAsync('DELETE FROM workout_sets WHERE id = ?', [id]); }
export async function workoutExerciseHasCompletedSets(db: SQLiteDatabase, id: string): Promise<boolean> { return Boolean(await db.getFirstAsync('SELECT id FROM workout_sets WHERE workout_exercise_id = ? AND completed = 1 LIMIT 1', [id])); }
export async function removeWorkoutExercise(db: SQLiteDatabase, id: string): Promise<void> { await db.withExclusiveTransactionAsync(async (transaction) => { const row = await transaction.getFirstAsync<{ workout_id: string }>('SELECT workout_id FROM workout_exercises WHERE id = ?', [id]); if (!row) return; const current = await transaction.getAllAsync<{ id: string }>('SELECT id FROM workout_exercises WHERE workout_id = ? ORDER BY exercise_order', [row.workout_id]); await transaction.runAsync('DELETE FROM workout_exercises WHERE id = ?', [id]); const remaining = removeWorkoutExerciseId(current.map((item) => item.id), id); for (const [index, itemId] of remaining.entries()) await transaction.runAsync('UPDATE workout_exercises SET exercise_order = ? WHERE id = ?', [index, itemId]); }); }
export async function reorderWorkoutExercise(db: SQLiteDatabase, workoutId: string, orderedIds: string[]): Promise<void> { await db.withExclusiveTransactionAsync(async (transaction) => { for (const [index, id] of orderedIds.entries()) await transaction.runAsync('UPDATE workout_exercises SET exercise_order = ? WHERE id = ? AND workout_id = ?', [index, id, workoutId]); }); }
export async function finishWorkout(db:SQLiteDatabase,workout:ActiveWorkout):Promise<void>{const now=new Date().toISOString();await db.withExclusiveTransactionAsync(async transaction=>{const cardio=await transaction.getFirstAsync<{count:number}>('SELECT COUNT(*) AS count FROM cardio_sessions WHERE workout_id=?',[workout.id]);const type=deriveWorkoutType(workout,cardio?.count??0);await transaction.runAsync(`UPDATE workouts SET status='completed',workout_type=?,completed_at=?,duration_seconds=?,updated_at=? WHERE id=? AND status='active'`,[type,now,elapsedSeconds(workout.startedAt),now,workout.id]);});
  // Runs after the completion transaction commits: each exercise recalculates in its own transaction (see personalRecordService).
  // A recalculation failure must not undo an already-completed workout, so it is caught rather than rethrown.
  try { await recalculateRecordsForExercises(db, workout.exercises.map((item) => item.exerciseId)); }
  catch (error) { if (__DEV__) console.error('Personal-record recalculation failed', error); }
}
/** Discard permanently deletes the active aggregate; child rows cascade in the same transaction. */
export async function discardWorkout(db: SQLiteDatabase, id: string): Promise<void> { await db.withExclusiveTransactionAsync(async (transaction) => { await transaction.runAsync("DELETE FROM workouts WHERE id = ? AND status = 'active'", [id]); }); }
export async function getWorkoutSummary(db: SQLiteDatabase, id: string): Promise<WorkoutSummary | null> { const workout = await getWorkoutById(db, id); return workout ? summarizeWorkout(workout) : null; }

const historySelect = `SELECT w.*, wp.name AS plan_name,
  COUNT(DISTINCT we.id) AS exercise_count,
  COALESCE(SUM(CASE WHEN ws.completed = 1 THEN 1 ELSE 0 END), 0) AS completed_set_count,
  COALESCE(SUM(CASE WHEN ws.completed = 1 THEN COALESCE(ws.reps, 0) ELSE 0 END), 0) AS total_repetitions,
  COALESCE(SUM(CASE WHEN ws.completed = 1 AND ws.weight > 0 AND ws.reps > 0 THEN ws.weight * ws.reps ELSE 0 END), 0) AS total_volume,
  COALESCE((SELECT SUM(cs.duration_seconds) FROM cardio_sessions cs WHERE cs.workout_id=w.id),0) AS cardio_duration_seconds,
  COALESCE((SELECT SUM(cs.distance) FROM cardio_sessions cs WHERE cs.workout_id=w.id),0) AS cardio_distance_km
  FROM workouts w LEFT JOIN workout_plans wp ON wp.id = w.plan_id
  LEFT JOIN workout_exercises we ON we.workout_id = w.id
  LEFT JOIN workout_sets ws ON ws.workout_exercise_id = we.id`;

function mapHistory(row: HistoryRow): WorkoutHistoryItem {
  return { id: row.id, planId: row.plan_id, planName: row.plan_name, name: row.name,
    workoutType: row.workout_type, startedAt: row.started_at, completedAt: row.completed_at ?? row.started_at,
    durationSeconds: row.duration_seconds ?? 0, notes: row.notes, exerciseCount: row.exercise_count,
    completedSetCount:row.completed_set_count,totalRepetitions:row.total_repetitions,totalVolume:row.total_volume,cardioDurationSeconds:row.cardio_duration_seconds,cardioDistanceKm:row.cardio_distance_km };
}

function historyQuery(filter: WorkoutHistoryFilter, sort: WorkoutHistorySort): { sql: string; params: (string | number)[] } {
  const where = ["w.status = 'completed'"]; const params: (string | number)[] = [];
  const term = filter.search.trim();
  // EXISTS avoids multiplying aggregate rows while searching related exercise names.
  if (term) { const like = `%${term}%`; where.push(`(w.name LIKE ? COLLATE NOCASE OR COALESCE(w.notes, '') LIKE ? COLLATE NOCASE
    OR COALESCE(wp.name, '') LIKE ? COLLATE NOCASE OR EXISTS (SELECT 1 FROM workout_exercises swe JOIN exercises se ON se.id = swe.exercise_id WHERE swe.workout_id = w.id AND se.name LIKE ? COLLATE NOCASE))`); params.push(like, like, like, like); }
  const preset = dateBoundsForPreset(filter.datePreset); let from = filter.dateFrom ?? preset.from; let to = filter.dateTo ?? preset.to;
  if (filter.datePreset === 'custom') { const fromDate = from ? new Date(`${from}T00:00:00`) : null; const toDate = to ? new Date(`${to}T23:59:59.999`) : null; if ((fromDate && Number.isNaN(fromDate.getTime())) || (toDate && Number.isNaN(toDate.getTime())) || (fromDate && toDate && fromDate > toDate)) throw new AppError('Enter a valid date range.'); from = fromDate?.toISOString(); to = toDate?.toISOString(); }
  if (from) { where.push('w.completed_at >= ?'); params.push(from); } if (to) { where.push('w.completed_at <= ?'); params.push(to); }
  if (filter.workoutType) { where.push('w.workout_type = ?'); params.push(filter.workoutType); }
  if (filter.planId) { where.push('w.plan_id = ?'); params.push(filter.planId); }
  if (filter.exerciseId) { where.push('EXISTS (SELECT 1 FROM workout_exercises fwe WHERE fwe.workout_id = w.id AND fwe.exercise_id = ?)'); params.push(filter.exerciseId); }
  if (filter.minimumDurationSeconds) { where.push('COALESCE(w.duration_seconds, 0) >= ?'); params.push(filter.minimumDurationSeconds); }
  if (filter.hasNotes) where.push("TRIM(COALESCE(w.notes, '')) <> ''");
  const order = sort === 'oldest' ? 'w.completed_at ASC' : sort === 'longest' ? 'w.duration_seconds DESC'
    : sort === 'volume' ? 'total_volume DESC' : sort === 'sets' ? 'completed_set_count DESC' : 'w.completed_at DESC';
  return { sql: `${historySelect} WHERE ${where.join(' AND ')} GROUP BY w.id ORDER BY ${order}`, params };
}

/** Returns one bounded history page; callers reset offset whenever query controls change. */
export async function getCompletedWorkoutsPage(db: SQLiteDatabase, filter: WorkoutHistoryFilter, sort: WorkoutHistorySort, offset = 0, limit = 20): Promise<WorkoutHistoryItem[]> {
  const query = historyQuery(filter, sort); const rows = await db.getAllAsync<HistoryRow>(`${query.sql} LIMIT ? OFFSET ?`, [...query.params, limit, offset]);
  return rows.map(mapHistory);
}
export async function getCompletedWorkouts(db: SQLiteDatabase, filter: WorkoutHistoryFilter, sort: WorkoutHistorySort): Promise<WorkoutHistoryItem[]> { return getCompletedWorkoutsPage(db, filter, sort, 0, 20); }
export async function searchCompletedWorkouts(db: SQLiteDatabase, search: string, limit = 20): Promise<WorkoutHistoryItem[]> { return getCompletedWorkoutsPage(db, { search, datePreset: 'all' }, 'newest', 0, limit); }
export async function countCompletedWorkouts(db: SQLiteDatabase): Promise<number> { const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM workouts WHERE status = 'completed'"); return row?.count ?? 0; }
export async function getMostRecentCompletedWorkout(db: SQLiteDatabase): Promise<WorkoutHistoryItem | null> { const items = await getCompletedWorkoutsPage(db, { search: '', datePreset: 'all' }, 'newest', 0, 1); return items[0] ?? null; }
export async function getWorkoutSets(db: SQLiteDatabase, workoutExerciseId: string): Promise<WorkoutSet[]> { return (await db.getAllAsync<SetRow>('SELECT * FROM workout_sets WHERE workout_exercise_id = ? ORDER BY set_number', [workoutExerciseId])).map(mapSet); }
export async function getWorkoutExerciseDetails(db: SQLiteDatabase, workoutId: string): Promise<WorkoutExercise[]> { const workout = await getWorkoutById(db, workoutId); return workout?.exercises ?? []; }
export async function getWorkoutDetails(db: SQLiteDatabase, id: string): Promise<WorkoutDetails | null> {
  const workout = await getWorkoutById(db, id); if (!workout || workout.status !== 'completed') return null;
  const plan = workout.planId ? await db.getFirstAsync<{ name: string }>('SELECT name FROM workout_plans WHERE id = ?', [workout.planId]) : null;
  const summary = summarizeWorkout(workout); const [cardioSessions,groups]=await Promise.all([getCardioSessionsByWorkout(db,id),getGroupsForWorkout(db,id)]);
  return { ...workout, planName: plan?.name ?? null, cardioSessions, groups, exercises: workout.exercises.map((item) => ({
    ...item,
    sets: item.sets.map((set) => ({ ...set, volume: set.completed && (set.weight ?? 0) > 0 && (set.reps ?? 0) > 0 ? (set.weight ?? 0) * (set.reps ?? 0) : 0 })),
  })),
    summary: { exerciseCount: summary.exerciseCount, completedExerciseCount: summary.completedExercises, completedSetCount: summary.completedSets, totalRepetitions: summary.totalRepetitions, totalVolume: summary.totalVolume, averageRpe: summary.averageRpe, durationSeconds: workout.durationSeconds ?? 0 } };
}

/** Deletes the parent inside a transaction; foreign-key cascades remove exercises and sets. */
export async function deleteWorkout(db: SQLiteDatabase, id: string): Promise<void> {
  const existing = await getWorkoutById(db, id);
  try { await db.withExclusiveTransactionAsync(async (transaction) => { const result = await transaction.runAsync("DELETE FROM workouts WHERE id = ? AND status = 'completed'", [id]); if (result.changes !== 1) throw new AppError('Completed workout not found.'); }); } catch (error) { throw toAppError(error, 'Could not delete this workout.'); }
  // Records tied to this workout no longer have underlying data; recalculating from the exercise's
  // remaining history (rather than only deleting) restores the correct next-best record if one exists.
  if (existing) {
    try { await recalculateRecordsForExercises(db, existing.exercises.map((item) => item.exerciseId)); }
    catch (error) { if (__DEV__) console.error('Personal-record recalculation failed', error); }
  }
}

/** Repeats historical structure atomically and keeps prior values only as incomplete suggestions. */
export async function createWorkoutFromCompletedWorkout(db: SQLiteDatabase, sourceId: string): Promise<string> {
  const source = await getWorkoutById(db, sourceId); if (!source || source.status !== 'completed') throw new AppError('Completed workout not found.');
  const snapshot = buildRepeatedWorkoutSnapshot(source); const id = createId('workout'); const now = new Date().toISOString();
  try { await db.withExclusiveTransactionAsync(async (transaction) => { await assertNoActive(transaction);
    await transaction.runAsync(`INSERT INTO workouts (id, plan_id, name, workout_type, started_at, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`, [id, source.planId, snapshot.name, source.workoutType, now, now, now]);
    for (const item of snapshot.exercises) { const linkId = createId('workout_exercise'); await transaction.runAsync(`INSERT INTO workout_exercises (id, workout_id, exercise_id, exercise_order, target_sets, target_reps_min, target_reps_max, target_weight, rest_seconds, notes, started_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [linkId, id, item.exerciseId, item.exerciseOrder, item.sets.length, source.exercises[item.exerciseOrder]?.targetRepsMin, source.exercises[item.exerciseOrder]?.targetRepsMax, source.exercises[item.exerciseOrder]?.targetWeight, item.restSeconds, item.notes, now]);
      for (const [index, set] of item.sets.entries()) await transaction.runAsync(`INSERT INTO workout_sets (id, workout_exercise_id, set_number, weight, reps, set_type, rpe, completed, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`, [createId('workout_set'), linkId, index + 1, set.weight, set.reps, set.setType, set.rpe, set.notes, now, now]); }
  }); return id; } catch (error) { throw toAppError(error, 'Could not repeat this workout.'); }
}

export const duplicateCompletedWorkout = createWorkoutFromCompletedWorkout;

/** Derives plan targets from completed sets and creates the user-owned plan atomically. */
export async function duplicateWorkoutAsPlan(db: SQLiteDatabase, workoutId: string): Promise<string> {
  const workout = await getWorkoutById(db, workoutId); if (!workout || workout.status !== 'completed') throw new AppError('Completed workout not found.');
  const planId = createId('plan'); const now = new Date().toISOString();
  try { await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(`INSERT INTO workout_plans (id, name, description, color, is_builtin, is_archived, created_at, updated_at) VALUES (?, ?, ?, ?, 0, 0, ?, ?)`, [planId, `${workout.name} Plan`, 'Created from workout history', '#4ADE80', now, now]);
    for (const [index, item] of workout.exercises.entries()) { const target = derivePlanExerciseTarget(item.sets, item.targetWeight); await transaction.runAsync(`INSERT INTO plan_exercises (id, plan_id, exercise_id, exercise_order, target_sets, target_reps_min, target_reps_max, target_weight, rest_seconds, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [createId('plan_exercise'), planId, item.exerciseId, index, target.targetSets, target.targetRepsMin, target.targetRepsMax, target.targetWeight, item.restSeconds, item.notes]); }
  }); return planId; } catch (error) { throw toAppError(error, 'Could not create a plan from this workout.'); }
}

/** Replaces the completed aggregate atomically and never changes its completed status. */
export async function updateCompletedWorkout(db: SQLiteDatabase, input: UpdateCompletedWorkoutInput): Promise<void> {
  if (input.name.trim().length < 2) throw new AppError('Enter a valid workout name, date, and duration.');
  if (input.exercises.some((exercise) => exercise.sets.some((set) => (set.weight ?? 0) < 0 || (set.reps ?? 0) < 0 || (set.rpe !== null && (set.rpe < 0 || set.rpe > 10))))) throw new AppError('Set weight and repetitions cannot be negative, and RPE must be between 0 and 10.');
  let timing: ReturnType<typeof calculateCompletedWorkoutTiming>; try { timing = calculateCompletedWorkoutTiming(input.startedAt, input.durationSeconds); } catch { throw new AppError('Enter a valid workout name, date, and duration.'); } const completedAt = timing.completedAt; const now = new Date().toISOString();
  const before = await getWorkoutById(db, input.id);
  try { await db.withExclusiveTransactionAsync(async (transaction) => { const existing = await transaction.getFirstAsync<{ id: string }>("SELECT id FROM workouts WHERE id = ? AND status = 'completed'", [input.id]); if (!existing) throw new AppError('Completed workout not found.');
    await transaction.runAsync(`UPDATE workouts SET name = ?, started_at = ?, completed_at = ?, duration_seconds = ?, notes = ?, updated_at = ? WHERE id = ? AND status = 'completed'`, [input.name.trim(), timing.startedAt, completedAt, timing.durationSeconds, input.notes, now, input.id]);
    await transaction.runAsync('DELETE FROM workout_exercises WHERE workout_id = ?', [input.id]);
    for (const exercise of input.exercises) { const linkId = createId('workout_exercise'); await transaction.runAsync(`INSERT INTO workout_exercises (id, workout_id, exercise_id, exercise_order, target_sets, target_reps_min, target_reps_max, target_weight, rest_seconds, notes, started_at, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [linkId, input.id, exercise.exerciseId, exercise.exerciseOrder, exercise.targetSets, exercise.targetRepsMin, exercise.targetRepsMax, exercise.targetWeight, exercise.restSeconds, exercise.notes, input.startedAt, completedAt]);
      for (const set of exercise.sets) await transaction.runAsync(`INSERT INTO workout_sets (id, workout_exercise_id, set_number, weight, reps, set_type, rpe, completed, completed_at, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [createId('workout_set'), linkId, set.setNumber, set.weight, set.reps, set.setType, set.rpe, set.completed ? 1 : 0, set.completed ? completedAt : null, set.notes, now, now]); }
  }); } catch (error) { throw toAppError(error, 'Could not update this completed workout.'); }
  // Recalculates the union of exercises before and after the edit, so removed exercises lose
  // records tied to this workout and added/changed exercises pick up any new best.
  const affectedExerciseIds = new Set([...(before?.exercises.map((item) => item.exerciseId) ?? []), ...input.exercises.map((item) => item.exerciseId)]);
  try { await recalculateRecordsForExercises(db, Array.from(affectedExerciseIds)); }
  catch (error) { if (__DEV__) console.error('Personal-record recalculation failed', error); }
}

/** Finds the latest completed occurrence without coupling the active screen to history UI. */
export async function getPreviousExercisePerformance(db: SQLiteDatabase, exerciseId: string, before: string): Promise<PreviousExercisePerformance | null> {
  const row = await db.getFirstAsync<{ completed_at: string; set_count: number; weight: number | null; reps: number | null }>(`SELECT w.completed_at, COUNT(ws.id) AS set_count, ws.weight, ws.reps FROM workouts w JOIN workout_exercises we ON we.workout_id = w.id JOIN workout_sets ws ON ws.workout_exercise_id = we.id WHERE w.status = 'completed' AND we.exercise_id = ? AND w.completed_at < ? AND ws.completed = 1 GROUP BY w.id ORDER BY w.completed_at DESC, ws.weight DESC LIMIT 1`, [exerciseId, before]);
  return row ? { workoutDate: row.completed_at, setCount: row.set_count, weight: row.weight, reps: row.reps } : null;
}
