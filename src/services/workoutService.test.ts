import { describe, expect, it } from 'vitest';

import type { Exercise } from '@/types/exercise';
import type { ActiveWorkout, WorkoutSet } from '@/types/workout';
import type { WorkoutPlanWithExercises } from '@/types/workoutPlan';
import {
  assertCanFinish,
  assertCanStartWorkout,
  buildWorkoutSnapshot,
  calculateSetVolume,
  calculateWorkoutVolume,
  elapsedSeconds,
  removeWorkoutExerciseId,
  summarizeWorkout,
} from './workoutService';

const exercise: Exercise = {
  id: 'bench-press', name: 'Bench Press', category: 'Chest', primaryMuscles: ['Chest'],
  secondaryMuscles: ['Triceps'], equipment: 'Barbell', exerciseType: 'strength', instructions: [],
  isBuiltin: true, isArchived: false, createdAt: '2026-01-01', updatedAt: '2026-01-01',
};

const set = (overrides: Partial<WorkoutSet> = {}): WorkoutSet => ({
  id: 'set-1', workoutExerciseId: 'link-1', setNumber: 1, weight: 100, reps: 5,
  setType: 'working', rpe: null, completed: true, completedAt: '2026-01-01', notes: null,
  createdAt: '2026-01-01', updatedAt: '2026-01-01', ...overrides,
});

const workout = (sets: WorkoutSet[]): ActiveWorkout => ({
  id: 'workout-1', planId: 'plan-1', name: 'Strength', workoutType: 'strength',
  startedAt: '2026-01-01T10:00:00Z', completedAt: null, durationSeconds: null,
  notes: null, status: 'active', createdAt: '2026-01-01', updatedAt: '2026-01-01',
  exercises: [{ id: 'link-1', workoutId: 'workout-1', exerciseId: exercise.id, exerciseOrder: 0,
    targetSets: 3, targetRepsMin: 5, targetRepsMax: 8, targetWeight: 100, restSeconds: 90,
    notes: 'Pause', startedAt: null, completedAt: null, exercise, sets }],
});

describe('workout calculations', () => {
  it('excludes persisted paused time from elapsed workout time',()=>expect(elapsedSeconds('2026-01-01T00:00:00.000Z',new Date('2026-01-01T00:10:00.000Z').getTime(),120)).toBe(480));
  it('uses the documented weight × reps example', () => expect(calculateSetVolume(set())).toBe(500));
  it('excludes incomplete, zero-weight, and zero-repetition sets', () => {
    expect(calculateSetVolume(set({ completed: false }))).toBe(0);
    expect(calculateSetVolume(set({ weight: 0 }))).toBe(0);
    expect(calculateSetVolume(set({ reps: 0 }))).toBe(0);
  });
  it('totals completed workout volume and summary values', () => {
    const value = workout([set(), set({ id: 'set-2', weight: 50, reps: 10 }), set({ id: 'set-3', completed: false })]);
    expect(calculateWorkoutVolume(value)).toBe(1000);
    expect(summarizeWorkout(value)).toMatchObject({ completedExercises: 1, completedSets: 2, totalRepetitions: 15, totalVolume: 1000 });
  });
});

describe('starting and finishing workouts', () => {
  it('copies plan targets and creates independent IDs', () => {
    const plan: WorkoutPlanWithExercises = { id: 'plan-1', name: 'Plan', description: null, color: null, workoutType: 'strength',
      isBuiltin: false, isArchived: false, createdAt: '2026-01-01', updatedAt: '2026-01-01',
      exerciseCount: 1, estimatedSetCount: 3, exercises: [{ id: 'plan-link', planId: 'plan-1',
        exerciseId: exercise.id, exerciseOrder: 4, targetSets: 3, targetRepsMin: 5,
        targetRepsMax: 8, targetWeight: 100, restSeconds: 90, notes: 'Pause', exercise }] };
    let id = 0; const snapshot = buildWorkoutSnapshot(plan, (prefix) => `${prefix}-${++id}`);
    expect(snapshot[0]).toMatchObject({ exerciseId: exercise.id, exerciseOrder: 0, targetSets: 3,
      targetRepsMin: 5, targetRepsMax: 8, targetWeight: 100, restSeconds: 90, notes: 'Pause' });
    expect(snapshot[0].id).not.toBe('plan-link');
    expect(snapshot[0].setIds).toHaveLength(3);
  });
  it('prevents a second active workout', () => expect(() => assertCanStartWorkout('active-1')).toThrow('Finish or discard'));
  it('allows a workout when no active ID exists', () => expect(() => assertCanStartWorkout(null)).not.toThrow());
  it('requires a completed set before finish', () => expect(() => assertCanFinish(workout([set({ completed: false })]))).toThrow('Complete at least one'));
  it('accepts a completed set', () => expect(() => assertCanFinish(workout([set()]))).not.toThrow());
});

describe('exercise removal', () => {
  it('removes the selected ID while preserving order', () => expect(removeWorkoutExerciseId(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']));
});
