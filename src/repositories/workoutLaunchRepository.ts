import type { SQLiteDatabase } from 'expo-sqlite';

import { copyPlanGroupsToWorkout } from '@/repositories/planGroupRepository';
import type { QuickWorkoutInput, WorkoutLaunchMetadata, WorkoutSessionSnapshot } from '@/types/workoutLaunch';
import type { WorkoutPlanWithExercises } from '@/types/workoutPlan';
import { AppError, toAppError } from '@/utils/errors';
import { createId } from '@/utils/ids';

async function assertNoActive(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ id:string }>("SELECT id FROM workouts WHERE status='active' LIMIT 1");
  if (row) throw new AppError('A workout is already in progress. Resume or discard it before starting another.');
}

/** Persists the immutable snapshot, copied exercises/sets, group membership, and calendar link atomically. */
export async function insertSessionFromSnapshot(db: SQLiteDatabase, plan: WorkoutPlanWithExercises, snapshot: WorkoutSessionSnapshot, metadata: WorkoutLaunchMetadata): Promise<string> {
  const id=createId('workout'); const now=new Date().toISOString(); const json=JSON.stringify(snapshot);
  try { await db.withExclusiveTransactionAsync(async transaction=>{
    const existing=await transaction.getFirstAsync<{id:string}>('SELECT id FROM workouts WHERE launch_operation_id=?',[metadata.launchOperationId]);
    if(existing) throw new AppError('This workout has already started.');
    await assertNoActive(transaction);
    const linkedPlanId=metadata.linkedPlanId===undefined?plan.id:metadata.linkedPlanId;
    await transaction.runAsync(`INSERT INTO workouts (id,plan_id,name,workout_type,started_at,status,created_at,updated_at,session_source_type,session_source_id,scheduled_workout_id,program_id,program_week_number,program_day_id,launch_operation_id,original_snapshot_json,current_snapshot_json,session_schema_version,actual_started_at)
      VALUES (?,?,?,?,?,'active',?,?,?,?,?,?,?,?,?,?,?,?,?)`,[id,linkedPlanId,plan.name,plan.workoutType,now,now,now,metadata.sourceType,metadata.sourceId??plan.id,metadata.scheduledWorkoutId??null,metadata.programId??null,metadata.programWeekNumber??null,metadata.programDayId??null,metadata.launchOperationId,json,json,1,now]);
    const map=new Map<string,string>();
    for(const item of plan.exercises){const link=createId('workout_exercise');map.set(item.id,link);await transaction.runAsync(`INSERT INTO workout_exercises (id,workout_id,exercise_id,exercise_order,target_sets,target_reps_min,target_reps_max,target_weight,rest_seconds,notes,started_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,[link,id,item.exerciseId,item.exerciseOrder,item.targetSets,item.targetRepsMin,item.targetRepsMax,item.targetWeight,item.restSeconds,item.notes,now]);for(let n=1;n<=Math.max(0,item.targetSets??0);n++)await transaction.runAsync(`INSERT INTO workout_sets (id,workout_exercise_id,set_number,weight,reps,set_type,completed,created_at,updated_at) VALUES (?,?,?,?,?,'working',0,?,?)`,[createId('workout_set'),link,n,item.targetWeight,item.targetRepsMin,now,now]);}
    if(linkedPlanId)await copyPlanGroupsToWorkout(transaction,linkedPlanId,id,map);
    if(metadata.scheduledWorkoutId){const changed=await transaction.runAsync(`UPDATE scheduled_workouts SET status='in_progress',active_session_id=?,actual_started_at=?,updated_at=? WHERE id=? AND status IN ('scheduled','missed','skipped')`,[id,now,now,metadata.scheduledWorkoutId]);if(changed.changes!==1)throw new AppError('This scheduled workout is no longer available to start.');}
  });return id;}catch(error){throw toAppError(error,'Could not start this workout.');}
}

export async function insertQuickSession(db:SQLiteDatabase,input:QuickWorkoutInput,metadata:WorkoutLaunchMetadata):Promise<string>{const id=createId('workout');const now=new Date().toISOString();const snapshot:WorkoutSessionSnapshot={schemaVersion:1,name:input.name,workoutType:input.workoutType,estimatedDurationMinutes:null,notes:input.notes??null,sourcePlanId:null,sourcePlanUpdatedAt:null,exercises:[]};const json=JSON.stringify(snapshot);try{await db.withExclusiveTransactionAsync(async transaction=>{await assertNoActive(transaction);await transaction.runAsync(`INSERT INTO workouts (id,name,workout_type,started_at,notes,status,created_at,updated_at,session_source_type,session_source_id,launch_operation_id,original_snapshot_json,current_snapshot_json,session_schema_version,actual_started_at) VALUES (?,?,?,?,?,'active',?,?,?,?,?,?,?,?,?)`,[id,input.name,input.workoutType,now,input.notes??null,now,now,metadata.sourceType,metadata.sourceId??null,metadata.launchOperationId,json,json,1,now]);});return id;}catch(error){throw toAppError(error,'Could not start this workout.');}}

export async function restoreScheduledAfterDiscard(db:SQLiteDatabase,sessionId:string,keepScheduled:boolean):Promise<void>{await db.withExclusiveTransactionAsync(async transaction=>{const row=await transaction.getFirstAsync<{scheduled_workout_id:string|null}>('SELECT scheduled_workout_id FROM workouts WHERE id=? AND status=\'active\'',[sessionId]);await transaction.runAsync("DELETE FROM workouts WHERE id=? AND status='active'",[sessionId]);if(row?.scheduled_workout_id)await transaction.runAsync('UPDATE scheduled_workouts SET status=?,active_session_id=NULL,actual_started_at=NULL,updated_at=? WHERE id=?',[keepScheduled?'scheduled':'skipped',new Date().toISOString(),row.scheduled_workout_id]);});}
