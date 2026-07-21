export const workoutGroupTypes = ['superset', 'giant_set', 'circuit'] as const;
export type WorkoutGroupType = (typeof workoutGroupTypes)[number];
export interface WorkoutGroupExercise { id: string; groupId: string; workoutExerciseId: string; exerciseOrder: number; createdAt: string; exerciseName?: string; }
export interface WorkoutGroup { id: string; workoutId: string; groupType: WorkoutGroupType; name: string | null; groupOrder: number; targetRounds: number | null; completedRounds: number; restBetweenExercisesSeconds: number | null; restBetweenRoundsSeconds: number | null; notes: string | null; createdAt: string; updatedAt: string; exercises: WorkoutGroupExercise[]; }
export type Superset = WorkoutGroup & { groupType: 'superset' };
export type GiantSet = WorkoutGroup & { groupType: 'giant_set' };
export type Circuit = WorkoutGroup & { groupType: 'circuit' };
export interface CreateWorkoutGroupInput { workoutId: string; groupType: WorkoutGroupType; name: string | null; targetRounds: number; restBetweenExercisesSeconds: number; restBetweenRoundsSeconds: number; notes: string | null; workoutExerciseIds: string[]; }
export interface PlanGroupExercise { id: string; groupId: string; planExerciseId: string; exerciseOrder: number; createdAt: string; }
export interface PlanGroup { id: string; planId: string; groupType: WorkoutGroupType; name: string | null; groupOrder: number; targetRounds: number | null; restBetweenExercisesSeconds: number | null; restBetweenRoundsSeconds: number | null; notes: string | null; createdAt: string; updatedAt: string; exercises: PlanGroupExercise[]; }
