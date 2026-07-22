export const workoutPlanTypes = [
  'strength', 'running', 'cycling', 'swimming', 'walking', 'yoga', 'mobility', 'hiit', 'hybrid', 'other',
] as const;

export type WorkoutPlanType = (typeof workoutPlanTypes)[number];

/** Only 'strength' has a type-specific editor today; the rest are foundation-only tags for now. */
export const workoutPlanTypeLabels: Record<WorkoutPlanType, string> = {
  strength: 'Strength', running: 'Running', cycling: 'Cycling', swimming: 'Swimming',
  walking: 'Walking', yoga: 'Yoga', mobility: 'Mobility', hiit: 'HIIT', hybrid: 'Hybrid', other: 'Other',
};
