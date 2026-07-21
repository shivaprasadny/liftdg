import type { ActiveWorkout, WorkoutSet, WorkoutSummary } from '@/types/workout';
import type { WorkoutPlanWithExercises } from '@/types/workoutPlan';
import { AppError } from '../utils/errors';
import { createId } from '../utils/ids';

export interface WorkoutSnapshotRow {
  id: string; exerciseId: string; exerciseOrder: number; targetSets: number | null;
  targetRepsMin: number | null; targetRepsMax: number | null; targetWeight: number | null;
  restSeconds: number | null; notes: string | null; setIds: string[];
}

/** Copies targets by value; no plan-exercise relation is retained in the active workout. */
export function buildWorkoutSnapshot(
  plan: WorkoutPlanWithExercises, idFactory: (prefix: string) => string = createId,
): WorkoutSnapshotRow[] {
  return plan.exercises.map((item, index) => ({ id: idFactory('workout_exercise'),
    exerciseId: item.exerciseId, exerciseOrder: index, targetSets: item.targetSets,
    targetRepsMin: item.targetRepsMin, targetRepsMax: item.targetRepsMax,
    targetWeight: item.targetWeight, restSeconds: item.restSeconds, notes: item.notes,
    setIds: Array.from({ length: item.targetSets ?? 0 }, () => idFactory('workout_set')) }));
}

/** Volume includes only completed sets with positive load and repetitions. */
export function calculateSetVolume(set: Pick<WorkoutSet, 'completed' | 'weight' | 'reps'> & Partial<Pick<WorkoutSet,'setType'|'addedWeight'>>): number {
  const load=set.setType==='bodyweight'?set.addedWeight??0:set.weight??0;
  return set.completed && load > 0 && (set.reps ?? 0) > 0 ? load * (set.reps ?? 0) : 0;
}
export function calculateWorkoutVolume(workout: ActiveWorkout): number {
  return workout.exercises.flatMap((item) => item.sets).reduce((total, set) => total + calculateSetVolume(set), 0);
}
export function summarizeWorkout(workout: ActiveWorkout): WorkoutSummary {
  const sets = workout.exercises.flatMap((item) => item.sets); const completed = sets.filter((set) => set.completed);
  const rated = completed.filter((set) => set.rpe !== null);
  return { workout, completedExercises: workout.exercises.filter((item) => item.sets.some((set) => set.completed)).length,
    completedSets: completed.length, totalRepetitions: completed.reduce((sum, set) => sum + (set.reps ?? 0), 0),
    totalVolume: calculateWorkoutVolume(workout), exerciseCount: workout.exercises.length,
    averageRpe: rated.length ? rated.reduce((sum, set) => sum + (set.rpe ?? 0), 0) / rated.length : null };
}
export function elapsedSeconds(startedAt: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
}
export function assertCanFinish(workout: ActiveWorkout): void {
  if (!workout.exercises.some((item) => item.sets.some((set) => set.completed))) throw new AppError('Complete at least one set before finishing.');
}

/** Enforces the same single-active-workout rule as the database partial index. */
export function assertCanStartWorkout(activeWorkoutId: string | null): void {
  if (activeWorkoutId) throw new AppError('Finish or discard the active workout before starting another.', { code: 'ACTIVE_WORKOUT_EXISTS' });
}

/** Returns the remaining IDs in their new contiguous order after removal. */
export function removeWorkoutExerciseId(orderedIds: string[], removedId: string): string[] {
  return orderedIds.filter((id) => id !== removedId);
}
