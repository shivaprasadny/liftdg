import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

import type { WorkoutPlanType } from '@/constants/workoutPlanTypes';
import { movePlanExercise } from '@/services/workoutPlanService';
import type { Exercise } from '@/types/exercise';
import type { PlanExerciseInput, WorkoutPlanWithExercises } from '@/types/workoutPlan';
import { createId } from '@/utils/ids';

export interface DraftPlanExercise extends PlanExerciseInput { draftId: string; exercise: Exercise; }
export interface PlanDraft { sourceId: string | null; name: string; description: string; color: string | null; workoutType: WorkoutPlanType; exercises: DraftPlanExercise[]; }

interface Value {
  draft: PlanDraft; reset: () => void; loadPlan: (plan: WorkoutPlanWithExercises) => void;
  setMetadata: (metadata: Pick<PlanDraft, 'name' | 'description' | 'color' | 'workoutType'>) => void;
  addExercises: (exercises: Exercise[]) => void; updateExercise: (id: string, patch: Partial<PlanExerciseInput>) => void;
  removeExercise: (id: string) => void; moveExercise: (index: number, direction: -1 | 1) => void;
}

const emptyDraft: PlanDraft = { sourceId: null, name: '', description: '', color: '#35E07A', workoutType: 'strength', exercises: [] };
const Context = createContext<Value | null>(null);

export function PlanDraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<PlanDraft>(emptyDraft);
  const value = useMemo<Value>(() => ({
    draft, reset: () => setDraft(emptyDraft),
    loadPlan: (plan) => setDraft({ sourceId: plan.id, name: plan.name, description: plan.description ?? '', color: plan.color, workoutType: plan.workoutType,
      exercises: plan.exercises.map((item) => ({ ...item, draftId: createId('draft') })) }),
    setMetadata: (metadata) => setDraft((current) => ({ ...current, ...metadata })),
    addExercises: (items) => setDraft((current) => {
      const existing = new Set(current.exercises.map((item) => item.exerciseId));
      const added = items.filter((item) => !existing.has(item.id)).map((exercise, offset) => ({
        draftId: createId('draft'), exercise, exerciseId: exercise.id,
        exerciseOrder: current.exercises.length + offset, targetSets: 3, targetRepsMin: 8,
        targetRepsMax: 12, targetWeight: null, restSeconds: 90, notes: null,
      }));
      return { ...current, exercises: [...current.exercises, ...added] };
    }),
    updateExercise: (id, patch) => setDraft((current) => ({ ...current,
      exercises: current.exercises.map((item) => item.draftId === id ? { ...item, ...patch } : item) })),
    removeExercise: (id) => setDraft((current) => ({ ...current,
      exercises: current.exercises.filter((item) => item.draftId !== id).map((item, index) => ({ ...item, exerciseOrder: index })) })),
    moveExercise: (index, direction) => setDraft((current) => ({ ...current,
      exercises: movePlanExercise(current.exercises, index, index + direction) as DraftPlanExercise[] })),
  }), [draft]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePlanDraft(): Value {
  const value = useContext(Context); if (!value) throw new Error('PlanDraftProvider is missing'); return value;
}
