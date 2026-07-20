import type { Exercise } from './exercise';

export const workoutStatuses = ['active', 'completed', 'cancelled'] as const;
export type WorkoutStatus = (typeof workoutStatuses)[number];
export type WorkoutType = 'strength' | 'mixed' | 'other';
export const setTypes = ['warmup', 'working', 'drop', 'failure', 'bodyweight'] as const;
export type SetType = (typeof setTypes)[number];

export interface WorkoutSet {
  id: string; workoutExerciseId: string; setNumber: number; weight: number | null;
  reps: number | null; setType: SetType; rpe: number | null; completed: boolean;
  completedAt: string | null; notes: string | null; createdAt: string; updatedAt: string;
}
export interface WorkoutExercise {
  id: string; workoutId: string; exerciseId: string; exerciseOrder: number;
  targetSets: number | null; targetRepsMin: number | null; targetRepsMax: number | null;
  targetWeight: number | null; restSeconds: number | null; notes: string | null;
  startedAt: string | null; completedAt: string | null; exercise: Exercise; sets: WorkoutSet[];
}
export interface Workout {
  id: string; planId: string | null; name: string; workoutType: WorkoutType;
  startedAt: string; completedAt: string | null; durationSeconds: number | null;
  notes: string | null; status: WorkoutStatus; createdAt: string; updatedAt: string;
}
export interface ActiveWorkout extends Workout { exercises: WorkoutExercise[]; }
export interface WorkoutSummary {
  workout: ActiveWorkout; completedExercises: number; completedSets: number;
  totalRepetitions: number; totalVolume: number;
}
export interface WorkoutSetUpdate {
  weight: number | null; reps: number | null; setType: SetType; rpe: number | null;
  completed: boolean; notes: string | null;
}
