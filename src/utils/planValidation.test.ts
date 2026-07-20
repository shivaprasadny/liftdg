import { describe, expect, it } from 'vitest';
import { planExerciseSchema, workoutPlanSchema } from './planValidation';

const exercise = { exerciseId: 'bench', exerciseOrder: 0, targetSets: 3, targetRepsMin: 8,
  targetRepsMax: 10, targetWeight: null, restSeconds: 90, notes: null };

describe('plan validation', () => {
  it('accepts a valid plan', () => expect(workoutPlanSchema.safeParse({ name: 'Push Day', description: null, color: null, exercises: [exercise] }).success).toBe(true));
  it('requires a two-character name', () => expect(workoutPlanSchema.safeParse({ name: 'P', description: null, color: null, exercises: [exercise] }).success).toBe(false));
  it('requires at least one exercise', () => expect(workoutPlanSchema.safeParse({ name: 'Empty Plan', description: null, color: null, exercises: [] }).success).toBe(false));
  it('restricts sets and rest time', () => expect(planExerciseSchema.safeParse({ ...exercise, targetSets: 21, restSeconds: -1 }).success).toBe(false));
});

describe('repetition range validation', () => {
  it('accepts an increasing repetition range', () => expect(planExerciseSchema.safeParse({ ...exercise, targetRepsMin: 6, targetRepsMax: 10 }).success).toBe(true));
  it('rejects maximum reps below minimum reps', () => expect(planExerciseSchema.safeParse({ ...exercise, targetRepsMin: 12, targetRepsMax: 8 }).success).toBe(false));
});
