import type { EquipmentType } from '@/constants/equipmentTypes';
import type { ExerciseCategory } from '@/constants/exerciseCategories';

export const exerciseTypes = ['strength', 'cardio', 'mobility', 'bodyweight', 'timed', 'other'] as const;
export type ExerciseType = (typeof exerciseTypes)[number];

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: EquipmentType;
  exerciseType: ExerciseType;
  instructions: string[];
  isBuiltin: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  movementPattern?: string | null;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | null;
  exerciseRole?: string | null;
  laterality?: 'bilateral' | 'unilateral' | 'alternating' | null;
  loadingStyle?: string | null;
}

export type ExerciseSeed = Omit<Exercise, 'createdAt' | 'updatedAt' | 'isArchived'>;

export interface CreateExerciseInput {
  name: string;
  category: ExerciseCategory;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: EquipmentType;
  exerciseType: ExerciseType;
  instructions: string[];
}

export interface ExerciseFilters {
  search?: string;
  category?: ExerciseCategory;
  equipment?: EquipmentType;
  exerciseType?: ExerciseType;
}

export interface ExercisePerformance {
  bestWeightKg: number | null;
  bestSet: { weightKg: number; reps: number } | null;
  estimatedOneRepMaxKg: number | null;
  recentWorkoutDates: string[];
}
