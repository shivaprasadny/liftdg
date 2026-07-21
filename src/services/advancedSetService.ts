import type { AdvancedSetType, BodyweightSet, DropSetStage, RestPauseStage } from '@/types/advancedSet';
import type { PlanGroup, WorkoutGroupType } from '@/types/workoutGroup';
import { AppError } from '../utils/errors';

export function validateGroupSize(type: WorkoutGroupType, size: number): void { const valid = type === 'superset' ? size === 2 : type === 'giant_set' ? size >= 3 : size >= 2; if (!valid) throw new AppError(type === 'giant_set' ? 'A giant set requires at least three exercises.' : 'This group requires two exercises.'); }
/** Two remaining giant-set exercises become a superset; one or zero dissolve the group. */
export function groupTypeAfterRemoval(type: WorkoutGroupType, size: number): WorkoutGroupType | null { if (size < 2) return null; if (type === 'giant_set' && size === 2) return 'superset'; return type; }
export function groupTypeAfterAddition(type: WorkoutGroupType, size: number): WorkoutGroupType { return type === 'superset' && size > 2 ? 'giant_set' : type; }
export function reorderGroupExerciseIds(ids: string[], from: number, to: number): string[] { if (from < 0 || to < 0 || from >= ids.length || to >= ids.length) return ids; const next = [...ids]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; }
export function calculateDropSetVolume(stages: AdvancedSetType[]): number { return stages.filter((item): item is Extract<AdvancedSetType, { setType: 'drop' }> => item.setType === 'drop' && item.completed).reduce((sum, item) => sum + item.weight * item.reps, 0); }
export function restPauseTotalRepetitions(stages: RestPauseStage[]): number { return stages.filter((item) => item.completed).reduce((sum, item) => sum + item.reps, 0); }
export function validateAmrap(set: Extract<AdvancedSetType, { setType: 'amrap' }>): void { if (set.mode === 'repetitions' ? set.reps < 0 || (set.timeLimitSeconds ?? 0) < 0 : set.durationSeconds <= 0 || set.rounds < 0 || set.additionalReps < 0) throw new AppError('Enter valid AMRAP results.'); }
export function isTimedSetComplete(durationSeconds: number, completed: boolean): boolean { return completed && durationSeconds > 0; }
/** First-version volume excludes bodyweight and assistance; only positive added load contributes. */
export function calculateBodyweightVolume(set: BodyweightSet): number { return set.completed && (set.addedWeightKg ?? 0) > 0 && set.reps > 0 ? (set.addedWeightKg as number) * set.reps : 0; }
export function formatBodyweightSet(set: Pick<BodyweightSet, 'reps' | 'addedWeightKg' | 'assistanceWeightKg'>): string { if ((set.addedWeightKg ?? 0) > 0) return `BW + ${set.addedWeightKg} kg × ${set.reps}`; if ((set.assistanceWeightKg ?? 0) > 0) return `BW − ${set.assistanceWeightKg} kg assistance × ${set.reps}`; return `BW × ${set.reps}`; }
export function formatAssistedSet(reps: number, assistanceKg: number): string { return `${assistanceKg} kg assistance × ${reps}`; }
export function updateCircuitRounds(current:number,target:number,action:'complete'|'skip'|'add'):number{if(action==='add')return target+1;if(action==='skip')return Math.min(target,current+1);return Math.min(target,current+1);}
export function buildWorkoutGroupCopies(groups:PlanGroup[],idMap:Map<string,string>){return groups.map(group=>({...group,workoutExerciseIds:group.exercises.map(item=>idMap.get(item.planExerciseId)).filter((id):id is string=>Boolean(id))}));}
/** Every completed stage is independently record-eligible; no synthetic parent candidate exists. */
export function advancedStageRecordValues(stages:AdvancedSetType[]):number[]{return stages.filter((stage):stage is DropSetStage|RestPauseStage=>(stage.setType==='drop'||stage.setType==='rest_pause')&&stage.completed).map(stage=>stage.weight*stage.reps);}
