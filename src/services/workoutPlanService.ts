import type { CreateWorkoutPlanInput, PlanExerciseInput, WorkoutPlanWithExercises } from '@/types/workoutPlan';

export function normalizePlanExerciseOrder(exercises: PlanExerciseInput[]): PlanExerciseInput[] {
  return exercises.map((exercise, index) => ({ ...exercise, exerciseOrder: index }));
}

export function movePlanExercise(exercises: PlanExerciseInput[], from: number, to: number): PlanExerciseInput[] {
  if (from < 0 || from >= exercises.length || to < 0 || to >= exercises.length) return normalizePlanExerciseOrder(exercises);
  const next = [...exercises];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return normalizePlanExerciseOrder(next);
}

export function createDuplicateInput(plan: WorkoutPlanWithExercises): CreateWorkoutPlanInput {
  return {
    name: `${plan.name} Copy`, description: plan.description, color: plan.color, workoutType: plan.workoutType,
    exercises: plan.exercises.map((item, index) => ({
      exerciseId: item.exerciseId, exerciseOrder: index, targetSets: item.targetSets,
      targetRepsMin: item.targetRepsMin, targetRepsMax: item.targetRepsMax,
      targetWeight: item.targetWeight, restSeconds: item.restSeconds, notes: item.notes,
    })),
  };
}

export function assertUserOwnedPlan(isBuiltin: boolean, action: string): void {
  if (isBuiltin) throw new Error(`Built-in plans cannot be ${action}`);
}

export function formatPlanTarget(exercise: Pick<PlanExerciseInput, 'targetSets' | 'targetRepsMin' | 'targetRepsMax'>): string {
  const sets = exercise.targetSets ?? 0;
  const min = exercise.targetRepsMin;
  const max = exercise.targetRepsMax;
  if (min == null) return `${sets} sets`;
  return `${sets} sets × ${max != null && max !== min ? `${min}–${max}` : min} reps`;
}
