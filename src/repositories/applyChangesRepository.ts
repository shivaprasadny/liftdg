import type { SQLiteDatabase } from 'expo-sqlite';

import type { ApplyReplacementsResult, ReplacedExerciseChange } from '@/types/applyChanges';
import type { WorkoutDetails } from '@/types/workout';
import { AppError, toAppError } from '@/utils/errors';

import { getExerciseById } from './exerciseRepository';
import { getPlanById } from './workoutPlanRepository';

interface AuditRow { original_exercise_id: string; replacement_exercise_id: string; reason: string | null; }

/**
 * Only fully replaced exercises (not partial) on a workout linked to a non-built-in plan, where the
 * plan still has a slot for the original exercise — i.e. the change is still applicable. Returns []
 * whenever there's nothing meaningful to propose, matching "don't show Apply Changes for no reason."
 */
export async function getReplacedExerciseChanges(db: SQLiteDatabase, workout: WorkoutDetails): Promise<ReplacedExerciseChange[]> {
  if (!workout.planId) return [];
  const plan = await getPlanById(db, workout.planId);
  if (!plan || plan.isBuiltin) return [];
  const planExerciseIds = new Set(plan.exercises.map((item) => item.exerciseId));

  const changes: ReplacedExerciseChange[] = [];
  for (const exercise of workout.exercises) {
    if (exercise.replacementStatus !== 'REPLACED' || !exercise.replacementAuditId) continue;
    const audit = await db.getFirstAsync<AuditRow>(
      'SELECT original_exercise_id, replacement_exercise_id, reason FROM exercise_replacement_audits WHERE id = ?',
      [exercise.replacementAuditId],
    );
    if (!audit || !planExerciseIds.has(audit.original_exercise_id)) continue;
    const [original, replacement] = await Promise.all([getExerciseById(db, audit.original_exercise_id), getExerciseById(db, audit.replacement_exercise_id)]);
    if (!original || !replacement) continue;
    changes.push({
      workoutExerciseId: exercise.id, originalExerciseId: original.id, originalExerciseName: original.name,
      replacementExerciseId: replacement.id, replacementExerciseName: replacement.name, reason: audit.reason,
    });
  }
  return changes;
}

/** "Update Linked Workout Template" scope — the only apply scope implemented so far. Skips (never overwrites) if the replacement is already in the plan elsewhere. */
export async function applyReplacementsToPlan(db: SQLiteDatabase, planId: string, changes: ReplacedExerciseChange[]): Promise<ApplyReplacementsResult> {
  const skipped: ApplyReplacementsResult['skipped'] = [];
  let appliedCount = 0;
  try {
    await db.withExclusiveTransactionAsync(async (transaction) => {
      for (const change of changes) {
        const duplicate = await transaction.getFirstAsync<{ id: string }>(
          'SELECT id FROM plan_exercises WHERE plan_id = ? AND exercise_id = ?', [planId, change.replacementExerciseId],
        );
        if (duplicate) { skipped.push({ originalExerciseName: change.originalExerciseName, replacementExerciseName: change.replacementExerciseName, reason: 'already in this workout' }); continue; }
        const result = await transaction.runAsync(
          'UPDATE plan_exercises SET exercise_id = ? WHERE plan_id = ? AND exercise_id = ?',
          [change.replacementExerciseId, planId, change.originalExerciseId],
        );
        if (result.changes === 1) appliedCount += 1;
        else skipped.push({ originalExerciseName: change.originalExerciseName, replacementExerciseName: change.replacementExerciseName, reason: 'no longer in this workout' });
      }
      await transaction.runAsync('UPDATE workout_plans SET updated_at = ? WHERE id = ?', [new Date().toISOString(), planId]);
    });
  } catch (error) { throw toAppError(error, 'Could not apply these changes to the workout template.'); }
  if (appliedCount === 0 && skipped.length === changes.length) throw new AppError('None of the selected changes could be applied.');
  return { appliedCount, skipped };
}
