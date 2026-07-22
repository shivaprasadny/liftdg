import type { Exercise } from './exercise';
import type { CardioSession } from './cardio';
import type { WorkoutGroup } from './workoutGroup';
import type { WorkoutPlanType } from '@/constants/workoutPlanTypes';

export const workoutStatuses = ['active', 'completed', 'cancelled'] as const;
export type WorkoutStatus = (typeof workoutStatuses)[number];
export type WorkoutType = WorkoutPlanType | 'cardio' | 'mixed';
export const setTypes = ['warmup', 'working', 'drop', 'rest_pause', 'failure', 'backoff', 'bodyweight', 'assisted', 'timed', 'distance', 'amrap', 'custom'] as const;
export type SetType = (typeof setTypes)[number];

export interface WorkoutSet {
  id: string; workoutExerciseId: string; setNumber: number; weight: number | null;
  reps: number | null; setType: SetType; rpe: number | null; completed: boolean;
  durationSeconds?: number | null; distance?: number | null; groupId?: string | null;
  groupType?: string | null; groupOrder?: number | null; stageNumber?: number | null;
  assistanceWeight?: number | null; bodyweightValue?: number | null; addedWeight?: number | null;
  roundNumber?: number | null; targetDurationSeconds?: number | null; targetDistance?: number | null;
  isAmrap?: boolean; completedAt: string | null; notes: string | null; createdAt: string; updatedAt: string;
  addedDuringSession?: boolean; weightMode?: 'external_weight'|'bodyweight'|'bodyweight_plus'|'assisted'|'machine'|'band'|'none';
}
export interface WorkoutExercise {
  id: string; workoutId: string; exerciseId: string; exerciseOrder: number;
  targetSets: number | null; targetRepsMin: number | null; targetRepsMax: number | null;
  targetWeight: number | null; restSeconds: number | null; notes: string | null;
  startedAt: string | null; completedAt: string | null; exercise: Exercise; sets: WorkoutSet[];
  sessionStatus?: 'not_started'|'in_progress'|'completed'|'skipped'|'removed'; skippedReason?:string|null; addedDuringSession?:boolean;
  originalExerciseId?:string|null;replacementStatus?:'ORIGINAL'|'REPLACED'|'PARTIALLY_REPLACED'|'ADDED'|'REMOVED'|'REVERTED';replacementAuditId?:string|null;replacementReason?:string|null;replacementTransferMode?:string|null;
}
export interface Workout {
  id: string; planId: string | null; name: string; workoutType: WorkoutType;
  startedAt: string; completedAt: string | null; durationSeconds: number | null;
  notes: string | null; status: WorkoutStatus; createdAt: string; updatedAt: string;
  pausedAt?: string | null; totalPausedSeconds?: number; currentExerciseId?: string | null;
  correctedLocalDate?:string|null;
  completionQuality?:'complete'|'partial'|'empty'|null;sessionSourceType?:string|null;localWorkoutDate?:string|null;originalSnapshotJson?:string|null;currentSnapshotJson?:string|null;
}
export interface ActiveWorkout extends Workout { exercises: WorkoutExercise[]; }
export interface WorkoutSummary {
  workout: ActiveWorkout; completedExercises: number; completedSets: number;
  totalRepetitions: number; totalVolume: number; averageRpe: number | null; exerciseCount: number;
}
export interface WorkoutSetUpdate {
  weight: number | null; reps: number | null; setType: SetType; rpe: number | null;
  completed: boolean; notes: string | null; durationSeconds?: number | null; distance?: number | null;
  groupId?: string | null; groupType?: string | null; groupOrder?: number | null; stageNumber?: number | null;
  assistanceWeight?: number | null; bodyweightValue?: number | null; addedWeight?: number | null;
  roundNumber?: number | null; targetDurationSeconds?: number | null; targetDistance?: number | null; isAmrap?: boolean;
}

export type WorkoutHistoryGroup = 'Today' | 'Yesterday' | 'This Week' | 'Earlier This Month' | 'Older';
export type WorkoutHistorySort = 'newest' | 'oldest' | 'longest' | 'volume' | 'sets';
export type WorkoutDatePreset = '7d' | '30d' | '3m' | 'year' | 'all' | 'custom';
export interface WorkoutHistoryFilter {
  search: string; datePreset: WorkoutDatePreset; dateFrom?: string; dateTo?: string;
  workoutType?: WorkoutType; planId?: string; exerciseId?: string;
  minimumDurationSeconds?: number; hasNotes?: boolean;
}
export interface WorkoutHistoryItem {
  id: string; planId: string | null; planName: string | null; name: string;
  workoutType: WorkoutType; startedAt: string; completedAt: string; durationSeconds: number;
  notes: string | null; exerciseCount: number; completedSetCount: number;
  totalRepetitions: number; totalVolume: number; cardioDurationSeconds: number; cardioDistanceKm: number;
  completionQuality?:'complete'|'partial'|'empty'|null;sourceType?:string|null;localWorkoutDate?:string|null;personalRecordCount?:number;
}
export interface WorkoutHistorySection { title: WorkoutHistoryGroup; data: WorkoutHistoryItem[]; }
export type WorkoutSetDetails = WorkoutSet & { volume: number };
export type WorkoutExerciseDetails = Omit<WorkoutExercise, 'sets'> & { sets: WorkoutSetDetails[] };
export type WorkoutDetails = Omit<ActiveWorkout, 'exercises'> & {
  planName: string | null; exercises: WorkoutExerciseDetails[]; cardioSessions: CardioSession[];
  groups: WorkoutGroup[]; summary: WorkoutHistorySummary;
};
export interface WorkoutHistorySummary {
  exerciseCount: number; completedExerciseCount: number; completedSetCount: number;
  totalRepetitions: number; totalVolume: number; averageRpe: number | null; durationSeconds: number;
}
export interface UpdateCompletedWorkoutInput {
  id: string; name: string; startedAt: string; durationSeconds: number; notes: string | null;
  exercises: { id: string; exerciseId: string; exerciseOrder: number; notes: string | null;
    targetSets: number | null; targetRepsMin: number | null; targetRepsMax: number | null;
    targetWeight: number | null; restSeconds: number | null; sets: (WorkoutSetUpdate & { id?: string; setNumber: number })[] }[];
}
export interface PreviousExercisePerformance {
  workoutDate: string; setCount: number; weight: number | null; reps: number | null;
}
