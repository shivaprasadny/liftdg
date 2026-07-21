import type { SQLiteDatabase } from 'expo-sqlite';
export interface IntegrityIssue { code:string; count:number; repairable:boolean }
export async function checkDatabaseIntegrity(db:SQLiteDatabase):Promise<IntegrityIssue[]>{
  const checks:[string,string,boolean][]=[
    ['foreign_keys','SELECT COUNT(*) count FROM pragma_foreign_key_check',false],
    ['orphaned_sets','SELECT COUNT(*) count FROM workout_sets ws LEFT JOIN workout_exercises we ON we.id=ws.workout_exercise_id WHERE we.id IS NULL',true],
    ['orphaned_workout_groups','SELECT COUNT(*) count FROM workout_group_exercises ge LEFT JOIN workout_groups g ON g.id=ge.group_id LEFT JOIN workout_exercises we ON we.id=ge.workout_exercise_id WHERE g.id IS NULL OR we.id IS NULL',true],
    ['orphaned_plan_groups','SELECT COUNT(*) count FROM plan_group_exercises ge LEFT JOIN plan_groups g ON g.id=ge.group_id LEFT JOIN plan_exercises pe ON pe.id=ge.plan_exercise_id WHERE g.id IS NULL OR pe.id IS NULL',true],
    ['orphaned_measurement_values','SELECT COUNT(*) count FROM body_measurement_values v LEFT JOIN body_measurement_entries e ON e.id=v.entry_id LEFT JOIN measurement_types t ON t.id=v.measurement_type_id WHERE e.id IS NULL OR t.id IS NULL',true],
    ['duplicate_active_workouts',"SELECT MAX((SELECT COUNT(*) FROM workouts WHERE status='active')-1,0) count",false],
    ['invalid_workout_status',"SELECT COUNT(*) count FROM workouts WHERE status NOT IN ('active','completed','cancelled')",false],
    ['invalid_workout_type',"SELECT COUNT(*) count FROM workouts WHERE workout_type NOT IN ('strength','cardio','mixed','mobility','other')",false],
    ['invalid_timestamps',"SELECT COUNT(*) count FROM workouts WHERE datetime(started_at) IS NULL OR (completed_at IS NOT NULL AND datetime(completed_at) IS NULL)",false],
  ];const issues:IntegrityIssue[]=[];for(const[code,sql,repairable]of checks){const row=await db.getFirstAsync<{count:number}>(sql);if((row?.count??0)>0)issues.push({code,count:row?.count??0,repairable});}return issues;
}
/** Repairs only relationship rows that are already unusable; parent workout/exercise data is never removed. */
export async function repairSafeOrphans(db:SQLiteDatabase):Promise<void>{await db.withExclusiveTransactionAsync(async tx=>{await tx.runAsync('DELETE FROM workout_sets WHERE workout_exercise_id NOT IN (SELECT id FROM workout_exercises)');await tx.runAsync('DELETE FROM workout_group_exercises WHERE group_id NOT IN (SELECT id FROM workout_groups) OR workout_exercise_id NOT IN (SELECT id FROM workout_exercises)');await tx.runAsync('DELETE FROM plan_group_exercises WHERE group_id NOT IN (SELECT id FROM plan_groups) OR plan_exercise_id NOT IN (SELECT id FROM plan_exercises)');await tx.runAsync('DELETE FROM body_measurement_values WHERE entry_id NOT IN (SELECT id FROM body_measurement_entries) OR measurement_type_id NOT IN (SELECT id FROM measurement_types)');});}
