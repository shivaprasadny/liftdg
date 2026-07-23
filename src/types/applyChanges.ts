/**
 * Smallest slice of "Apply Changes" (DECISIONS.md #48): detects exercises that were fully replaced
 * during a completed workout and offers to carry that swap into the source Workout Template — the
 * only change type and the only two scopes implemented so far. Completed history is never touched;
 * this only ever writes to `plan_exercises`.
 */
export interface ReplacedExerciseChange {
  workoutExerciseId: string;
  originalExerciseId: string;
  originalExerciseName: string;
  replacementExerciseId: string;
  replacementExerciseName: string;
  reason: string | null;
}

export interface ApplyReplacementsResult {
  appliedCount: number;
  skipped: { originalExerciseName: string; replacementExerciseName: string; reason: string }[];
}
