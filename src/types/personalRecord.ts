export const personalRecordTypes = [
  'max_weight', 'max_reps', 'best_set_volume', 'estimated_one_rep_max', 'best_workout_volume',
] as const;
export type PersonalRecordType = (typeof personalRecordTypes)[number];

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  workoutId: string;
  workoutSetId: string | null;
  recordType: PersonalRecordType;
  value: number;
  secondaryValue: number | null;
  achievedAt: string;
  createdAt: string;
  updatedAt: string;
}

/** A record annotated with the best value it superseded, for "previous best" UI copy. */
export interface PersonalRecordWithDelta extends PersonalRecord {
  previousValue: number | null;
}

export interface PersonalRecordGroup {
  exerciseId: string;
  exerciseName: string;
  records: PersonalRecordWithDelta[];
}

export interface PersonalRecordFilter {
  exerciseId?: string;
  recordType?: PersonalRecordType;
  from?: string;
  to?: string;
}

/** A candidate produced by scanning one workout's completed sets, not yet compared to history. */
export interface PersonalRecordCandidate {
  exerciseId: string;
  workoutId: string;
  workoutSetId: string | null;
  recordType: PersonalRecordType;
  value: number;
  secondaryValue: number | null;
  achievedAt: string;
}
