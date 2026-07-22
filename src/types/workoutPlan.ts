import type { WorkoutPlanType } from '@/constants/workoutPlanTypes';

import type { Exercise } from './exercise';

export interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  workoutType: WorkoutPlanType;
  isBuiltin: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  exerciseCount: number;
  estimatedSetCount: number;
}

export interface WorkoutPlanExercise {
  id: string;
  planId: string;
  exerciseId: string;
  exerciseOrder: number;
  targetSets: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetWeight: number | null;
  restSeconds: number | null;
  notes: string | null;
  exercise: Exercise;
}

export interface WorkoutPlanWithExercises extends WorkoutPlan { exercises: WorkoutPlanExercise[]; }

export interface PlanExerciseInput {
  id?: string;
  exerciseId: string;
  exerciseOrder: number;
  targetSets: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetWeight: number | null;
  restSeconds: number | null;
  notes: string | null;
}

export interface CreateWorkoutPlanInput {
  name: string;
  description: string | null;
  color: string | null;
  workoutType: WorkoutPlanType;
  exercises: PlanExerciseInput[];
}

export interface UpdateWorkoutPlanInput extends CreateWorkoutPlanInput { id: string; }

export interface StarterPlanSeed {
  id: string; name: string; description: string; color: string;
  exercises: Omit<PlanExerciseInput, 'exerciseOrder'>[];
}
