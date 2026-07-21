import type { ExerciseNavigationItem } from '@/types/exerciseNavigation';
import type { WorkoutExercise } from '@/types/workout';
import type { WorkoutGroup } from '@/types/workoutGroup';

const groupName = (group: WorkoutGroup): string => {
  const letter = String.fromCharCode(65 + group.groupOrder);
  const fallback = group.groupType === 'giant_set' ? 'Giant Set' : group.groupType === 'superset' ? 'Superset' : 'Circuit';
  return `${group.name?.trim() || fallback} ${letter}`;
};

export function getExerciseCompletion(exercise: WorkoutExercise): ExerciseNavigationItem['completionStatus'] {
  const completed = exercise.sets.filter((set) => set.completed).length;
  const required = exercise.targetSets ?? exercise.sets.length;
  if (required > 0 && completed >= required) return 'complete';
  return completed > 0 ? 'in_progress' : 'not_started';
}

/** Group headings and advanced-set stages are metadata, so only ordered workout exercise rows become navigation items. */
export function buildExerciseNavigationItems(exercises: WorkoutExercise[], groups: WorkoutGroup[]): ExerciseNavigationItem[] {
  const membership = new Map<string, { group: WorkoutGroup; position: number }>();
  for (const group of groups) {
    const members = [...group.exercises].sort((a, b) => a.exerciseOrder - b.exerciseOrder);
    members.forEach((member, position) => membership.set(member.workoutExerciseId, { group, position }));
  }
  return [...exercises].sort((a, b) => a.exerciseOrder - b.exerciseOrder).map((exercise, order) => {
    const member = membership.get(exercise.id);
    const completedSets = exercise.sets.filter((set) => set.completed).length;
    return {
      id: exercise.id,
      order,
      name: exercise.exercise.name,
      category: exercise.exercise.category,
      exerciseType: exercise.exercise.exerciseType,
      completedSets,
      totalSets: exercise.targetSets ?? exercise.sets.length,
      completionStatus: getExerciseCompletion(exercise),
      group: member ? {
        id: member.group.id,
        type: member.group.groupType,
        label: groupName(member.group),
        marker: String.fromCharCode(65 + member.group.groupOrder),
        position: member.position,
        size: member.group.exercises.length,
        targetRounds: member.group.targetRounds ?? 1,
        completedRounds: member.group.completedRounds,
      } : null,
      workoutExercise: exercise,
    };
  });
}

export function adjacentExerciseId(items: ExerciseNavigationItem[], currentId: string | null, direction: -1 | 1): string | null {
  const index = items.findIndex((item) => item.id === currentId);
  if (index < 0) return direction === 1 ? items[0]?.id ?? null : null;
  return items[index + direction]?.id ?? null;
}

/** A circuit loops through its members for each target round without duplicating workout exercise records. */
export function nextExerciseTarget(
  items: ExerciseNavigationItem[], currentId: string | null, circuitRound: number,
): { exerciseId: string | null; circuitRound: number } {
  const index = items.findIndex((item) => item.id === currentId);
  if (index < 0) return { exerciseId: items[0]?.id ?? null, circuitRound };
  const current = items[index];
  if (current.group?.type === 'circuit' && current.group.position === current.group.size - 1 && circuitRound < current.group.targetRounds) {
    const groupId = current.group.id;
    const first = items.find((item) => item.group?.id === groupId && item.group?.position === 0);
    if (first) return { exerciseId: first.id, circuitRound: circuitRound + 1 };
  }
  return { exerciseId: items[index + 1]?.id ?? null, circuitRound };
}

export function previousExerciseTarget(
  items: ExerciseNavigationItem[], currentId: string | null, circuitRound: number,
): { exerciseId: string | null; circuitRound: number } {
  const index = items.findIndex((item) => item.id === currentId);
  if (index < 0) return { exerciseId: null, circuitRound };
  const current = items[index];
  if (current.group?.type === 'circuit' && current.group.position === 0 && circuitRound > 1) {
    const groupId = current.group.id;
    const last = [...items].reverse().find((item) => item.group?.id === groupId && item.group?.position === current.group!.size - 1);
    if (last) return { exerciseId: last.id, circuitRound: circuitRound - 1 };
  }
  return { exerciseId: items[index - 1]?.id ?? null, circuitRound };
}

export function recoverFocusedExercise(previousIds: string[], currentId: string, items: ExerciseNavigationItem[]): string | null {
  if (items.some((item) => item.id === currentId)) return currentId;
  const oldIndex = previousIds.indexOf(currentId);
  if (oldIndex < 0) return items[0]?.id ?? null;
  return items[oldIndex]?.id ?? items[oldIndex - 1]?.id ?? null;
}
