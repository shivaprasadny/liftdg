import type { ExerciseType } from './exercise';
import type { WorkoutExercise } from './workout';
import type { WorkoutGroupType } from './workoutGroup';

export type ExerciseCompletionStatus = 'not_started' | 'in_progress' | 'complete' | 'skipped';
export type ActiveWorkoutDisplayMode = 'list' | 'focused';
export type AutoAdvancePreference = boolean;

export interface ExerciseNavigationGroup {
  id: string;
  type: WorkoutGroupType;
  label: string;
  marker: string;
  position: number;
  size: number;
  targetRounds: number;
  completedRounds: number;
}

export interface ExerciseNavigationItem {
  id: string;
  order: number;
  name: string;
  category: string;
  exerciseType: ExerciseType;
  completedSets: number;
  totalSets: number;
  completionStatus: ExerciseCompletionStatus;
  group: ExerciseNavigationGroup | null;
  workoutExercise: WorkoutExercise;
}

export interface ActiveExerciseNavigationState {
  currentExerciseId: string | null;
  currentExerciseIndex: number;
  totalExerciseCount: number;
  previousExerciseId: string | null;
  nextExerciseId: string | null;
  displayMode: ActiveWorkoutDisplayMode;
}

export interface FocusedExerciseState extends ActiveExerciseNavigationState {
  currentExercise: ExerciseNavigationItem | null;
  previousExercise: ExerciseNavigationItem | null;
  nextExercise: ExerciseNavigationItem | null;
}
