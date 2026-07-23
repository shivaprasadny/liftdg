import type { Daypart, ScheduledWorkoutStatus } from '@/constants/scheduledWorkout';
import type { WorkoutPlanType } from '@/constants/workoutPlanTypes';

/**
 * A one-time calendar entry linking a local date to a plan (DECISIONS.md #46). `planId` is nullable
 * because deleting the source plan must not delete calendar history — the snapshot fields below are
 * what the Agenda actually displays, so the item stays meaningful even if planId later resolves to nothing.
 */
export interface ScheduledWorkout {
  id: string;
  planId: string | null;
  scheduledDate: string;
  daypart: Daypart | null;
  startTime: string | null;
  snapshotName: string;
  snapshotWorkoutType: WorkoutPlanType;
  estimatedDurationMinutes: number | null;
  status: ScheduledWorkoutStatus;
  notes: string | null;
  /** Non-null only for occurrences created by "Start Program" (DECISIONS.md #47). No ActiveProgram/pause/resume lifecycle yet — this column alone is what "program-linked" means. */
  programId: string | null;
  programWeekNumber: number | null;
  programDayId: string | null;
  activeSessionId?: string | null;
  actualStartedAt?: string | null;
  snapshotJson?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleWorkoutInput {
  planId: string;
  scheduledDate: string;
  daypart: Daypart | null;
  startTime: string | null;
  notes: string | null;
  programId?: string | null;
  programWeekNumber?: number | null;
  programDayId?: string | null;
}

/** "Only This Workout" scope, the only one that exists yet — a plain field update on one row. */
export interface UpdateScheduledWorkoutInput {
  scheduledDate: string;
  daypart: Daypart | null;
  notes: string | null;
}

/** One set of occurrences created by a single Start Program operation. */
export interface ProgramScheduleBatch {
  programId: string;
  batchCreatedAt: string;
  startDate: string;
  endDate: string;
  totalCount: number;
  eligibleCount: number;
  completedCount: number;
  inProgressCount: number;
  cancelledCount: number;
}

export interface CancelProgramScheduleResult {
  cancelledCount: number;
  preservedCompletedCount: number;
  preservedInProgressCount: number;
}
