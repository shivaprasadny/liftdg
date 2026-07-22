import type { SQLiteDatabase } from 'expo-sqlite';
import { format } from 'date-fns';

import { insertQuickSession, insertSessionFromSnapshot } from '@/repositories/workoutLaunchRepository';
import { getScheduledWorkoutById, updateScheduledWorkout } from '@/repositories/scheduledWorkoutRepository';
import { getPlanById } from '@/repositories/workoutPlanRepository';
import { getExerciseById } from '@/repositories/exerciseRepository';
import type { QuickWorkoutInput, SessionSourceType, WorkoutSessionSnapshot } from '@/types/workoutLaunch';
import type { WorkoutPlanWithExercises } from '@/types/workoutPlan';
import type { ScheduledWorkout } from '@/types/scheduledWorkout';
import { AppError } from '@/utils/errors';
import { createId } from '@/utils/ids';

export const SESSION_SCHEMA_VERSION = 1 as const;
export function localTodayKey(now=new Date()):string{return format(now,'yyyy-MM-dd')}
export function buildSessionSnapshot(plan:WorkoutPlanWithExercises):WorkoutSessionSnapshot{return{schemaVersion:SESSION_SCHEMA_VERSION,name:plan.name,workoutType:plan.workoutType,estimatedDurationMinutes:null,notes:plan.description,sourcePlanId:plan.id,sourcePlanUpdatedAt:plan.updatedAt,exercises:plan.exercises.map(item=>({...item,exercise:{...item.exercise,primaryMuscles:[...item.exercise.primaryMuscles],secondaryMuscles:[...item.exercise.secondaryMuscles],instructions:[...item.exercise.instructions]}}))}}
export function parseScheduledSnapshot(value:string|null|undefined):WorkoutPlanWithExercises|null{if(!value)return null;try{const parsed:unknown=JSON.parse(value);if(!parsed||typeof parsed!=='object')return null;const candidate=parsed as Partial<WorkoutPlanWithExercises>;return typeof candidate.id==='string'&&typeof candidate.name==='string'&&Array.isArray(candidate.exercises)?candidate as WorkoutPlanWithExercises:null}catch{return null}}
const rank=(item:ScheduledWorkout)=>item.startTime??({morning:'08:00',afternoon:'15:00',evening:'19:00',anytime:'23:59'}[item.daypart??'anytime']);
export function orderTodaysWorkouts(items:ScheduledWorkout[]):ScheduledWorkout[]{return[...items].sort((a,b)=>rank(a).localeCompare(rank(b))||a.createdAt.localeCompare(b.createdAt))}
export function assertLaunchEligible(item:ScheduledWorkout):void{if(item.status==='completed')throw new AppError('This workout is already completed. Start it again as a new workout instead.');if(item.status==='cancelled')throw new AppError('This scheduled workout was cancelled.');if(item.status==='in_progress'&&item.activeSessionId)throw new AppError('This workout is already in progress.')}
const launchLocks=new Set<string>();
export async function withWorkoutStartLock<T>(key:string,action:()=>Promise<T>):Promise<T>{if(launchLocks.has(key))throw new AppError('This workout is already starting.');launchLocks.add(key);try{return await action()}finally{launchLocks.delete(key)}}

export async function launchPlan(db:SQLiteDatabase,planId:string,sourceType:SessionSourceType='WORKOUT_TEMPLATE'):Promise<string>{
  return withWorkoutStartLock(`plan:${planId}`,async()=>{const plan=await getPlanById(db,planId);if(!plan)throw new AppError('This workout is no longer available.');return insertSessionFromSnapshot(db,plan,buildSessionSnapshot(plan),{sourceType,sourceId:plan.id,launchOperationId:createId('launch')});});
}

export async function launchScheduledWorkout(db:SQLiteDatabase,scheduledId:string):Promise<string>{
  return withWorkoutStartLock(`scheduled:${scheduledId}`,async()=>{const item=await getScheduledWorkoutById(db,scheduledId);if(!item)throw new AppError('This scheduled workout no longer exists.');assertLaunchEligible(item);
    const livePlan=item.planId?await getPlanById(db,item.planId):null;const plan=livePlan??parseScheduledSnapshot(item.snapshotJson);if(!plan)throw new AppError('The workout snapshot is unavailable. Choose another workout.');
    return insertSessionFromSnapshot(db,plan,buildSessionSnapshot(plan),{sourceType:item.programId?'ACTIVE_PROGRAM':'SCHEDULED_WORKOUT',sourceId:item.id,scheduledWorkoutId:item.id,programId:item.programId,programWeekNumber:item.programWeekNumber,programDayId:item.programDayId,linkedPlanId:livePlan?.id??null,launchOperationId:createId('launch')});});
}

export async function moveScheduledWorkoutToToday(db:SQLiteDatabase,scheduledId:string):Promise<string>{const item=await getScheduledWorkoutById(db,scheduledId);if(!item)throw new AppError('Scheduled workout not found.');await updateScheduledWorkout(db,item.id,{scheduledDate:localTodayKey(),daypart:'anytime',notes:item.notes});return launchScheduledWorkout(db,item.id);}

export async function launchExtraScheduledWorkout(db:SQLiteDatabase,scheduledId:string):Promise<string>{return withWorkoutStartLock(`extra:${scheduledId}`,async()=>{const item=await getScheduledWorkoutById(db,scheduledId);if(!item)throw new AppError('Scheduled workout not found.');const plan=(item.planId?await getPlanById(db,item.planId):null)??parseScheduledSnapshot(item.snapshotJson);if(!plan)throw new AppError('The workout snapshot is unavailable.');return insertSessionFromSnapshot(db,plan,buildSessionSnapshot(plan),{sourceType:'EXTRA_PROGRAM_WORKOUT',sourceId:item.id,programId:item.programId,programWeekNumber:item.programWeekNumber,programDayId:item.programDayId,launchOperationId:createId('launch')});});}

export async function launchQuickWorkout(db:SQLiteDatabase,input:QuickWorkoutInput):Promise<string>{return withWorkoutStartLock(`quick:${input.sourceType}`,()=>insertQuickSession(db,input,{sourceType:input.sourceType,launchOperationId:createId('launch')}));}

export async function launchSingleExercise(db:SQLiteDatabase,exerciseId:string):Promise<string>{return withWorkoutStartLock(`exercise:${exerciseId}`,async()=>{const exercise=await getExerciseById(db,exerciseId);if(!exercise)throw new AppError('Exercise not found.');const now=new Date().toISOString();const plan:WorkoutPlanWithExercises={id:`single-${exercise.id}`,name:'Quick Workout',description:`Started with ${exercise.name}`,color:null,workoutType:'strength',isBuiltin:false,isArchived:false,createdAt:now,updatedAt:now,exerciseCount:1,estimatedSetCount:3,exercises:[{id:createId('plan_exercise_snapshot'),planId:`single-${exercise.id}`,exerciseId:exercise.id,exerciseOrder:0,targetSets:3,targetRepsMin:8,targetRepsMax:12,targetWeight:null,restSeconds:90,notes:null,exercise}]};return insertSessionFromSnapshot(db,plan,buildSessionSnapshot(plan),{sourceType:'SINGLE_EXERCISE',sourceId:exercise.id,linkedPlanId:null,launchOperationId:createId('launch')})})}
