import type { ActiveWorkout, WorkoutSet } from '@/types/workout';
import type { CompletionMetrics, WorkoutValidationIssue, WorkoutValidationResult } from '@/types/workoutCompletion';
import { elapsedSeconds } from './workoutService';

const makeIssue = (type:WorkoutValidationIssue['type'], severity:WorkoutValidationIssue['severity'], message:string, ids?:{exerciseId?:string;setId?:string}):WorkoutValidationIssue => ({ id:`${type}:${ids?.exerciseId??''}:${ids?.setId??''}`, type, severity, message, ...ids, resolvable:severity!=='notice' });
const setVolume = (set:WorkoutSet):number => { const load=set.setType==='bodyweight'?set.addedWeight??0:set.weight??0; return set.completed&&load>0&&(set.reps??0)>0?load*(set.reps??0):0; };

export function validateWorkoutForCompletion(workout:ActiveWorkout, now=Date.now()):WorkoutValidationResult {
  const blockingErrors:WorkoutValidationIssue[]=[]; const warnings:WorkoutValidationIssue[]=[]; const notices:WorkoutValidationIssue[]=[];
  if(workout.status!=='active') blockingErrors.push(makeIssue('SESSION_NOT_ACTIVE','blocking','This workout is no longer active.'));
  const seen=new Set<string>(); const sets=workout.exercises.flatMap(item=>item.sets);
  for(const exercise of workout.exercises){
    if(exercise.sessionStatus==='skipped') warnings.push(makeIssue('EXERCISE_SKIPPED','warning',`${exercise.exercise.name} was skipped.`,{exerciseId:exercise.id}));
    const completedCount=exercise.sets.filter(set=>set.completed).length;
    if(!completedCount&&exercise.sessionStatus!=='skipped'&&!exercise.addedDuringSession) warnings.push(makeIssue('EXERCISE_NOT_STARTED','warning',`${exercise.exercise.name} was not started.`,{exerciseId:exercise.id}));
    for(const set of exercise.sets){
      const ids={exerciseId:exercise.id,setId:set.id};
      if(seen.has(set.id)) blockingErrors.push(makeIssue('DUPLICATE_SET_ID','blocking','Duplicate set data was detected.',ids)); seen.add(set.id);
      if((set.weight??0)<0||(set.assistanceWeight??0)<0) blockingErrors.push(makeIssue('INVALID_WEIGHT','blocking','Weight values cannot be negative.',ids));
      if(set.reps!=null&&(set.reps<0||!Number.isInteger(set.reps))) blockingErrors.push(makeIssue('INVALID_REPS','blocking','Repetitions must be a non-negative whole number.',ids));
      if(set.rpe!=null&&(set.rpe<1||set.rpe>10)) blockingErrors.push(makeIssue('INVALID_RPE','blocking','RPE must be between 1 and 10.',ids));
      if(set.completed&&set.reps===0&&!['timed','distance'].includes(set.setType)) warnings.push(makeIssue('ZERO_REPS','warning','A completed set has zero repetitions.',ids));
      if(set.completed&&(set.weight??0)===0&&['working','backoff','drop','failure','amrap','custom'].includes(set.setType)) warnings.push(makeIssue('ZERO_WEIGHT','warning','A completed external-weight set has zero weight.',ids));
      if(!set.completed&&set.setNumber<=(exercise.targetSets??0)&&!exercise.addedDuringSession&&exercise.sessionStatus!=='skipped'&&set.setType!=='warmup') warnings.push(makeIssue('INCOMPLETE_SET','warning',`${exercise.exercise.name} set ${set.setNumber} is incomplete.`,ids));
    }
  }
  const completed=sets.filter(set=>set.completed);
  if(!completed.length) warnings.push(makeIssue('NO_COMPLETED_WORK','warning','No completed work was recorded.'));
  if(completed.length&&completed.every(set=>set.setType==='warmup')) warnings.push(makeIssue('ONLY_WARMUPS','warning','Only warm-up sets were completed.'));
  const elapsed=Math.max(0,Math.floor((now-new Date(workout.startedAt).getTime())/1000)); const active=elapsedSeconds(workout.startedAt,now,workout.totalPausedSeconds??0,workout.pausedAt);
  if(active<120&&completed.length) warnings.push(makeIssue('VERY_SHORT_DURATION','warning','This workout is less than two minutes long.'));
  const rated=completed.filter(set=>set.rpe!=null); const warmup=completed.filter(set=>set.setType==='warmup'); const working=completed.filter(set=>set.setType!=='warmup');
  const metrics:CompletionMetrics={ totalExercises:workout.exercises.length,completedExercises:workout.exercises.filter(item=>item.sets.some(set=>set.completed)).length,skippedExercises:workout.exercises.filter(item=>item.sessionStatus==='skipped').length,plannedSets:sets.filter(set=>!set.addedDuringSession).length,completedSets:completed.length,incompleteSets:sets.length-completed.length,addedSets:sets.filter(set=>set.addedDuringSession).length,warmupSets:warmup.length,workingSets:working.length,totalReps:completed.reduce((sum,set)=>sum+(set.reps??0),0),totalVolume:completed.reduce((sum,set)=>sum+setVolume(set),0),warmupVolume:warmup.reduce((sum,set)=>sum+setVolume(set),0),workingVolume:working.reduce((sum,set)=>sum+setVolume(set),0),averageRpe:rated.length?rated.reduce((sum,set)=>sum+(set.rpe??0),0)/rated.length:null,maximumRpe:rated.length?Math.max(...rated.map(set=>set.rpe??0)):null,activeDurationSeconds:active,elapsedDurationSeconds:elapsed,pausedDurationSeconds:workout.totalPausedSeconds??0 };
  const partial=warnings.some(item=>['INCOMPLETE_SET','EXERCISE_NOT_STARTED','EXERCISE_SKIPPED','ONLY_WARMUPS'].includes(item.type));
  return {sessionId:workout.id,canFinish:blockingErrors.length===0,blockingErrors,warnings,notices,metrics,createdAt:new Date(now).toISOString(),recommendedQuality:completed.length===0?'empty':partial?'partial':'complete'};
}
