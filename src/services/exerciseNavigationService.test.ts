import { describe, expect, it } from 'vitest';

import type { Exercise } from '@/types/exercise';
import type { WorkoutExercise, WorkoutSet } from '@/types/workout';
import type { WorkoutGroup } from '@/types/workoutGroup';
import { adjacentExerciseId, buildExerciseNavigationItems, nextExerciseTarget, previousExerciseTarget, recoverFocusedExercise } from './exerciseNavigationService';

const baseExercise: Exercise = { id: 'exercise', name: 'Exercise', category: 'Chest', primaryMuscles: [], secondaryMuscles: [], equipment: 'Bodyweight', exerciseType: 'strength', instructions: [], isBuiltin: true, isArchived: false, createdAt: '2026-01-01', updatedAt: '2026-01-01' };
const makeSet = (id: string, completed = false, setType: WorkoutSet['setType'] = 'working'): WorkoutSet => ({ id, workoutExerciseId: '', setNumber: 1, weight: 10, reps: 10, setType, rpe: null, completed, completedAt: null, notes: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' });
const makeExercise = (id: string, order: number, type: Exercise['exerciseType'] = 'strength', sets = [makeSet(`${id}-set`)]): WorkoutExercise => ({ id, workoutId: 'workout', exerciseId: id, exerciseOrder: order, targetSets: sets.length, targetRepsMin: 8, targetRepsMax: 10, targetWeight: null, restSeconds: 60, notes: null, startedAt: null, completedAt: null, exercise: { ...baseExercise, id, name: id, exerciseType: type }, sets: sets.map((set) => ({ ...set, workoutExerciseId: id })) });
const makeGroup = (type: WorkoutGroup['groupType'], ids: string[], targetRounds = 1): WorkoutGroup => ({ id: `${type}-group`, workoutId: 'workout', groupType: type, name: null, groupOrder: 0, targetRounds, completedRounds: 0, restBetweenExercisesSeconds: 0, restBetweenRoundsSeconds: 60, notes: null, createdAt: '2026-01-01', updatedAt: '2026-01-01', exercises: ids.map((id, index) => ({ id: `member-${id}`, groupId: `${type}-group`, workoutExerciseId: id, exerciseOrder: index, createdAt: '2026-01-01' })) });
const build = (exercises: WorkoutExercise[], groups: WorkoutGroup[] = []) => buildExerciseNavigationItems(exercises, groups);

describe('unified exercise navigation', () => {
  it('uses saved workout order and derives previous/next boundaries', () => {
    const items = build([makeExercise('third', 2), makeExercise('first', 0), makeExercise('second', 1)]);
    expect(items.map((item) => item.id)).toEqual(['first', 'second', 'third']);
    expect(adjacentExerciseId(items, 'first', -1)).toBeNull();
    expect(adjacentExerciseId(items, 'first', 1)).toBe('second');
    expect(adjacentExerciseId(items, 'third', 1)).toBeNull();
    expect(adjacentExerciseId(items, 'third', -1)).toBe('second');
  });

  it('reports position and supports direct jumps by stable ID', () => {
    const items = build([makeExercise('one', 0), makeExercise('two', 1), makeExercise('three', 2)]);
    expect(items.findIndex((item) => item.id === 'two') + 1).toBe(2);
    expect(items.find((item) => item.id === 'three')?.name).toBe('three');
  });

  it.each(['superset', 'giant_set'] as const)('keeps %s members in workout order', (type) => {
    const items = build([makeExercise('a1', 0), makeExercise('a2', 1), makeExercise('after', 2)], [makeGroup(type, ['a1', 'a2'])]);
    expect(items.map((item) => item.id)).toEqual(['a1', 'a2', 'after']);
    expect(items[0].group).toMatchObject({ marker: 'A', position: 0, size: 2, type });
    expect(adjacentExerciseId(items, 'a2', 1)).toBe('after');
  });

  it('loops circuit members by round, then exits the group', () => {
    const items = build([makeExercise('pushups', 0), makeExercise('squats', 1), makeExercise('rope', 2), makeExercise('after', 3)], [makeGroup('circuit', ['pushups', 'squats', 'rope'], 2)]);
    expect(nextExerciseTarget(items, 'pushups', 1)).toEqual({ exerciseId: 'squats', circuitRound: 1 });
    expect(nextExerciseTarget(items, 'rope', 1)).toEqual({ exerciseId: 'pushups', circuitRound: 2 });
    expect(nextExerciseTarget(items, 'rope', 2)).toEqual({ exerciseId: 'after', circuitRound: 2 });
    expect(previousExerciseTarget(items, 'pushups', 2)).toEqual({ exerciseId: 'rope', circuitRound: 1 });
  });

  it('does not count drop stages or rest-pause attempts as exercises', () => {
    const stages = [makeSet('drop-1', true, 'drop'), makeSet('drop-2', true, 'drop'), makeSet('pause-1', false, 'rest_pause')];
    expect(build([makeExercise('bench', 0, 'strength', stages)])).toHaveLength(1);
  });

  it('includes cardio, timed, bodyweight, and assisted exercises in the same list', () => {
    const items = build([makeExercise('run', 0, 'cardio'), makeExercise('plank', 1, 'timed'), makeExercise('pullup', 2, 'bodyweight'), makeExercise('assisted', 3, 'strength', [makeSet('assisted-set', false, 'assisted')])]);
    expect(items.map((item) => item.id)).toEqual(['run', 'plank', 'pullup', 'assisted']);
  });

  it('recalculates navigation after reorder without changing the selected ID', () => {
    const reordered = build([makeExercise('one', 2), makeExercise('two', 0), makeExercise('three', 1)]);
    expect(reordered.findIndex((item) => item.id === 'one')).toBe(2);
    expect(adjacentExerciseId(reordered, 'one', -1)).toBe('three');
  });

  it('selects next, then previous, after the focused exercise is deleted', () => {
    const oldIds = ['one', 'two', 'three'];
    expect(recoverFocusedExercise(oldIds, 'two', build([makeExercise('one', 0), makeExercise('three', 1)]))).toBe('three');
    expect(recoverFocusedExercise(oldIds, 'three', build([makeExercise('one', 0), makeExercise('two', 1)]))).toBe('two');
    expect(recoverFocusedExercise(['only'], 'only', [])).toBeNull();
  });

  it('includes newly added exercises and calculates completion labels', () => {
    const complete = makeExercise('complete', 0, 'strength', [makeSet('done', true)]);
    const items = build([complete, makeExercise('new', 1)]);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ completionStatus: 'complete', completedSets: 1, totalSets: 1 });
    expect(items[1].completionStatus).toBe('not_started');
  });
});
