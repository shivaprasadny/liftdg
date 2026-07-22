import { endOfDay, format, isSameDay, isSameMonth, isThisWeek, startOfDay, startOfYear, subDays, subMonths } from 'date-fns';

import type { ActiveWorkout, WorkoutDatePreset, WorkoutHistoryGroup, WorkoutHistoryItem, WorkoutHistorySection, WorkoutHistorySort, WorkoutSet } from '@/types/workout';
import type{HistoryCalendarDay,HistoryTimelineGroup}from'@/types/history';

const historyDate=(item:WorkoutHistoryItem)=>item.localWorkoutDate??format(new Date(item.completedAt),'yyyy-MM-dd');
export function buildHistoryCalendarDays(items:WorkoutHistoryItem[]):HistoryCalendarDay[]{const map=new Map<string,HistoryCalendarDay>();for(const item of items){const dateKey=historyDate(item);const current=map.get(dateKey)??{dateKey,workoutCount:0,workoutTypes:[],partialCount:0,emptyCount:0,personalRecordCount:0};current.workoutCount++;if(!current.workoutTypes.includes(item.workoutType))current.workoutTypes.push(item.workoutType);if(item.completionQuality==='partial')current.partialCount++;if(item.completionQuality==='empty')current.emptyCount++;current.personalRecordCount+=item.personalRecordCount??0;map.set(dateKey,current);}return[...map.values()].sort((a,b)=>a.dateKey.localeCompare(b.dateKey));}
export function buildHistoryTimeline(items:WorkoutHistoryItem[],now=new Date()):HistoryTimelineGroup[]{const map=new Map<string,HistoryTimelineGroup>();for(const item of items){const date=new Date(item.completedAt);const title=isSameDay(date,now)?'Today':isThisWeek(date,{weekStartsOn:1})?'This Week':format(date,'MMMM yyyy');const group=map.get(title)??{title,workoutCount:0,durationSeconds:0,personalRecordCount:0,workoutIds:[]};group.workoutCount++;group.durationSeconds+=item.durationSeconds;group.personalRecordCount+=item.personalRecordCount??0;group.workoutIds.push(item.id);map.set(title,group);}return[...map.values()];}

/** Groups parsed timestamps in the device timezone; SQL never makes locale assumptions. */
export function getWorkoutHistoryGroup(value: string, now = new Date()): WorkoutHistoryGroup {
  const date = new Date(value);
  if (isSameDay(date, now)) return 'Today';
  if (isSameDay(date, subDays(now, 1))) return 'Yesterday';
  if (isThisWeek(date, { weekStartsOn: 1 })) return 'This Week';
  if (isSameMonth(date, now)) return 'Earlier This Month';
  return 'Older';
}

export function groupWorkoutHistory(items: WorkoutHistoryItem[], now = new Date()): WorkoutHistorySection[] {
  const labels: WorkoutHistoryGroup[] = ['Today', 'Yesterday', 'This Week', 'Earlier This Month', 'Older'];
  return labels.map((title) => ({ title, data: items.filter((item) => getWorkoutHistoryGroup(item.completedAt, now) === title) })).filter((section) => section.data.length > 0);
}

export function sortWorkoutHistory(items: WorkoutHistoryItem[], sort: WorkoutHistorySort): WorkoutHistoryItem[] {
  const values = [...items];
  return values.sort((a, b) => sort === 'oldest' ? a.completedAt.localeCompare(b.completedAt)
    : sort === 'longest' ? b.durationSeconds - a.durationSeconds
    : sort === 'volume' ? b.totalVolume - a.totalVolume
    : sort === 'sets' ? b.completedSetCount - a.completedSetCount
    : b.completedAt.localeCompare(a.completedAt));
}

export function paginateHistory(items: WorkoutHistoryItem[], offset: number, limit: number): WorkoutHistoryItem[] {
  return items.slice(offset, offset + limit);
}

export function matchesWorkoutSearch(item: WorkoutHistoryItem, search: string, exerciseNames: string[] = []): boolean {
  const term = search.trim().toLocaleLowerCase();
  if (!term) return true;
  return [item.name, item.planName ?? '', item.notes ?? '', ...exerciseNames].some((value) => value.toLocaleLowerCase().includes(term));
}

export function dateBoundsForPreset(preset: WorkoutDatePreset, now = new Date()): { from?: string; to?: string } {
  if (preset === 'all' || preset === 'custom') return {};
  const from = preset === '7d' ? subDays(now, 7) : preset === '30d' ? subDays(now, 30)
    : preset === '3m' ? subMonths(now, 3) : startOfYear(now);
  return { from: startOfDay(from).toISOString(), to: endOfDay(now).toISOString() };
}

/** Derives targets from completed history, falling back when no usable reps remain. */
export function deriveTargetReps(sets: Pick<WorkoutSet, 'completed' | 'reps'>[]): { min: number; max: number } {
  const reps = sets.filter((set) => set.completed && (set.reps ?? 0) > 0).map((set) => set.reps as number);
  return reps.length ? { min: Math.min(...reps), max: Math.max(...reps) } : { min: 8, max: 10 };
}

export function derivePlanExerciseTarget(sets: Pick<WorkoutSet, 'completed' | 'reps' | 'weight'>[], fallbackWeight: number | null) {
  const completed = sets.filter((set) => set.completed); const range = deriveTargetReps(completed);
  return { targetSets: completed.length || 1, targetRepsMin: range.min, targetRepsMax: range.max,
    targetWeight: completed.find((set) => (set.weight ?? 0) > 0)?.weight ?? fallbackWeight };
}

export function calculateCompletedWorkoutTiming(startedAt: string, durationSeconds: number): { startedAt: string; completedAt: string; durationSeconds: number } {
  const start = new Date(startedAt); if (Number.isNaN(start.getTime()) || durationSeconds < 0) throw new Error('Invalid completed workout timing.');
  return { startedAt: start.toISOString(), completedAt: new Date(start.getTime() + durationSeconds * 1000).toISOString(), durationSeconds };
}

export interface RepeatedWorkoutSnapshot {
  name: string; exercises: { exerciseId: string; exerciseOrder: number; restSeconds: number | null;
    notes: string | null; sets: { weight: number | null; reps: number | null; setType: WorkoutSet['setType']; rpe: number | null; notes: string | null }[] }[];
}

/** Copies historical structure and suggestions while deliberately clearing completion state. */
export function buildRepeatedWorkoutSnapshot(workout: ActiveWorkout): RepeatedWorkoutSnapshot {
  return { name: workout.name, exercises: workout.exercises.map((item, exerciseOrder) => ({
    exerciseId: item.exerciseId, exerciseOrder, restSeconds: item.restSeconds, notes: item.notes,
    sets: item.sets.map((set) => ({ weight: set.weight, reps: set.reps, setType: set.setType, rpe: null, notes: set.notes })),
  })) };
}
