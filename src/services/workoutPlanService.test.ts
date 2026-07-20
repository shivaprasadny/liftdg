import { describe, expect, it } from 'vitest';

import type { WorkoutPlanWithExercises } from '@/types/workoutPlan';
import { assertUserOwnedPlan, createDuplicateInput, movePlanExercise, normalizePlanExerciseOrder } from './workoutPlanService';

const plan: WorkoutPlanWithExercises = {
  id: 'starter', name: 'Push Day', description: 'Push', color: '#fff', isBuiltin: true,
  isArchived: false, createdAt: '2026-01-01', updatedAt: '2026-01-01', exerciseCount: 1,
  estimatedSetCount: 3, exercises: [{ id: 'old-link', planId: 'starter', exerciseId: 'push-up',
    exerciseOrder: 0, targetSets: 3, targetRepsMin: 8, targetRepsMax: 12,
    targetWeight: null, restSeconds: 60, notes: 'Controlled', exercise: {
      id: 'push-up', name: 'Push-Up', category: 'Chest', primaryMuscles: ['Chest'],
      secondaryMuscles: ['Triceps'], equipment: 'Bodyweight', exerciseType: 'bodyweight',
      instructions: [], isBuiltin: true, isArchived: false, createdAt: '2026-01-01', updatedAt: '2026-01-01',
    } }],
};

describe('plan duplication', () => {
  it('creates a user-plan input with Copy and no preserved relation IDs', () => {
    const copy = createDuplicateInput(plan);
    expect(copy.name).toBe('Push Day Copy');
    expect(copy.exercises[0]).not.toHaveProperty('id');
    expect(copy.exercises[0]).not.toHaveProperty('planId');
    expect(copy.exercises[0].exerciseId).toBe('push-up');
  });
});

describe('plan exercise ordering', () => {
  const items = ['a', 'b', 'c'].map((exerciseId, exerciseOrder) => ({ exerciseId, exerciseOrder,
    targetSets: 3, targetRepsMin: 8, targetRepsMax: 10, targetWeight: null, restSeconds: 60, notes: null }));
  it('moves and renumbers exercises', () => {
    const moved = movePlanExercise(items, 2, 0);
    expect(moved.map((item) => item.exerciseId)).toEqual(['c', 'a', 'b']);
    expect(moved.map((item) => item.exerciseOrder)).toEqual([0, 1, 2]);
  });
  it('normalizes arbitrary order values', () => {
    expect(normalizePlanExerciseOrder(items.map((item) => ({ ...item, exerciseOrder: 99 }))).map((item) => item.exerciseOrder)).toEqual([0, 1, 2]);
  });
});

describe('built-in plan protection', () => {
  it('rejects destructive built-in actions', () => expect(() => assertUserOwnedPlan(true, 'deleted')).toThrow('Built-in plans'));
  it('allows user-owned actions', () => expect(() => assertUserOwnedPlan(false, 'edited')).not.toThrow());
});
