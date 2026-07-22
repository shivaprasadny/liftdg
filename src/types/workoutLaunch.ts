import type { WorkoutPlanType } from '@/constants/workoutPlanTypes';
import type { WorkoutPlanWithExercises } from './workoutPlan';

export const sessionSourceTypes = ['SCHEDULED_WORKOUT','ACTIVE_PROGRAM','WORKOUT_TEMPLATE','BUILT_IN_WORKOUT','RECENT_WORKOUT','FAVORITE_WORKOUT','QUICK_STRENGTH','QUICK_CARDIO','SINGLE_EXERCISE','BLANK_WORKOUT','EXTRA_PROGRAM_WORKOUT'] as const;
export type SessionSourceType = (typeof sessionSourceTypes)[number];

export interface WorkoutSessionSnapshot {
  schemaVersion: 1; name: string; workoutType: WorkoutPlanType; estimatedDurationMinutes: number | null;
  notes: string | null; sourcePlanId: string | null; sourcePlanUpdatedAt: string | null;
  exercises: WorkoutPlanWithExercises['exercises'];
}

export interface WorkoutLaunchMetadata {
  sourceType: SessionSourceType; sourceId?: string | null; scheduledWorkoutId?: string | null;
  programId?: string | null; programWeekNumber?: number | null; programDayId?: string | null;
  linkedPlanId?: string | null;
  launchOperationId: string;
}

export interface QuickWorkoutInput {
  name: string; workoutType: WorkoutPlanType; sourceType: 'QUICK_STRENGTH' | 'QUICK_CARDIO' | 'BLANK_WORKOUT';
  notes?: string | null;
}

export interface StartScreenTodayItem {
  id: string; name: string; workoutType: WorkoutPlanType; scheduledDate: string; startTime: string | null;
  daypart: string | null; estimatedDurationMinutes: number | null; status: string; notes: string | null;
  programName: string | null; programWeekNumber: number | null; isOptional: boolean;
}
