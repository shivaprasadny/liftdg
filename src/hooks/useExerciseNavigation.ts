import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { adjacentExerciseId, nextExerciseTarget, previousExerciseTarget, recoverFocusedExercise } from '@/services/exerciseNavigationService';
import type { ActiveWorkoutDisplayMode, ExerciseNavigationItem, FocusedExerciseState } from '@/types/exerciseNavigation';

interface Options { workoutId: string; items: ExerciseNavigationItem[]; openInListView: boolean; openFirstIncomplete: boolean }

export function useExerciseNavigation({ workoutId, items, openInListView, openFirstIncomplete }: Options) {
  const storageKey = `liftdg:active-navigation:${workoutId}`;
  const [displayMode, setDisplayMode] = useState<ActiveWorkoutDisplayMode>(openInListView ? 'list' : 'focused');
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(null);
  const [circuitRounds, setCircuitRounds] = useState<Record<string, number>>({});
  const previousIds = useRef<string[]>([]);
  const [isRestored, setIsRestored] = useState(false);
  const initialOptions = useRef({ openInListView, openFirstIncomplete });

  useEffect(() => {
    let mounted = true;
    void AsyncStorage.getItem(storageKey).then((raw) => {
      if (!mounted) return;
      let saved: { currentExerciseId?: string; displayMode?: ActiveWorkoutDisplayMode } = {};
      if (raw) try { saved = JSON.parse(raw) as typeof saved; } catch { /* Invalid UI state is ignored. */ }
      setCurrentExerciseId(saved.currentExerciseId ?? null);
      setDisplayMode(saved.displayMode ?? (initialOptions.current.openInListView ? 'list' : 'focused'));
      setIsRestored(true);
    });
    return () => { mounted = false; };
  }, [storageKey]);

  useEffect(() => {
    const ids = items.map((item) => item.id);
    if (items.length > 0 && currentExerciseId && !ids.includes(currentExerciseId)) {
      setCurrentExerciseId(recoverFocusedExercise(previousIds.current, currentExerciseId, items));
      if (items.length === 0) setDisplayMode('list');
    } else if (!currentExerciseId && isRestored && items.length) {
      setCurrentExerciseId((initialOptions.current.openFirstIncomplete ? items.find((item) => item.completionStatus !== 'complete') : null)?.id ?? items[0].id);
    }
    previousIds.current = ids;
  }, [currentExerciseId, isRestored, items]);

  useEffect(() => {
    if (!isRestored) return;
    void AsyncStorage.setItem(storageKey, JSON.stringify({ currentExerciseId, displayMode }));
  }, [currentExerciseId, displayMode, isRestored, storageKey]);

  const currentIndex = items.findIndex((item) => item.id === currentExerciseId);
  const currentExercise = currentIndex >= 0 ? items[currentIndex] : null;
  const previousExerciseId = adjacentExerciseId(items, currentExerciseId, -1);
  const nextExerciseId = adjacentExerciseId(items, currentExerciseId, 1);
  const state: FocusedExerciseState = useMemo(() => ({
    currentExerciseId, currentExerciseIndex: currentIndex, totalExerciseCount: items.length,
    previousExerciseId, nextExerciseId, displayMode, currentExercise,
    previousExercise: items.find((item) => item.id === previousExerciseId) ?? null,
    nextExercise: items.find((item) => item.id === nextExerciseId) ?? null,
  }), [currentExercise, currentExerciseId, currentIndex, displayMode, items, nextExerciseId, previousExerciseId]);

  const goToExercise = useCallback((exerciseId: string) => { if (items.some((item) => item.id === exerciseId)) { setCurrentExerciseId(exerciseId); setDisplayMode('focused'); } }, [items]);
  const currentGroupId = currentExercise?.group?.id;
  const circuitRound = currentGroupId ? circuitRounds[currentGroupId] ?? Math.min(currentExercise!.group!.completedRounds + 1, currentExercise!.group!.targetRounds) : 1;
  const goPrevious = useCallback(() => {
    const target = previousExerciseTarget(items, currentExerciseId, circuitRound);
    if (currentGroupId && target.circuitRound !== circuitRound) setCircuitRounds((value) => ({ ...value, [currentGroupId]: target.circuitRound }));
    if (target.exerciseId) setCurrentExerciseId(target.exerciseId);
  }, [circuitRound, currentExerciseId, currentGroupId, items]);
  const goNext = useCallback(() => {
    if (!currentExercise) return;
    const groupId = currentExercise.group?.id;
    const round = groupId ? circuitRounds[groupId] ?? Math.min(currentExercise.group!.completedRounds + 1, currentExercise.group!.targetRounds) : 1;
    const target = nextExerciseTarget(items, currentExercise.id, round);
    if (groupId && target.circuitRound !== round) setCircuitRounds((value) => ({ ...value, [groupId]: target.circuitRound }));
    if (target.exerciseId) setCurrentExerciseId(target.exerciseId);
  }, [circuitRounds, currentExercise, items]);
  return { ...state, canGoPrevious: Boolean(previousExerciseId) || Boolean(currentExercise?.group?.type === 'circuit' && circuitRound > 1), canGoNext: Boolean(nextExerciseId) || Boolean(currentExercise?.group?.type === 'circuit' && circuitRound < currentExercise.group.targetRounds), circuitRound: currentExercise?.group ? circuitRound : null, goPrevious, goNext, goToExercise, returnToList: () => setDisplayMode('list') };
}
