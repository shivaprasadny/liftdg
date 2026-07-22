import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { DistanceUnit, WaterUnit, WeightUnit } from '@/types/settings';
import { kilometersToDisplay, kilogramsToDisplay } from '@/utils/units';
import { AppError, toAppError } from '@/utils/errors';
import { createCsv } from '@/utils/csv';
import { centimetersToFeetInches, centimetersToInches } from './bodyMeasurementService';
import { dailyTotalsByKey, formatServingAmount, formatWaterVolume, goalResolverFromHistory } from './hydrationService';
import { getAllWaterEntries } from '@/repositories/waterEntryRepository';
import { getGoalHistory } from '@/repositories/hydrationGoalHistoryRepository';

export type CsvExportType='workouts'|'workout-sets'|'exercises'|'cardio'|'personal-records'|'profile'|'weight-history'|'body-measurements';
const dateName=()=>new Date().toISOString().slice(0,10);

async function exportRows(db:SQLiteDatabase,type:CsvExportType,weightUnit:WeightUnit,distanceUnit:DistanceUnit):Promise<{headers:string[];rows:unknown[][]}>{
  if(type==='profile'){const r=await db.getFirstAsync<Record<string,unknown>>('SELECT * FROM user_profile LIMIT 1');const heightSetting=await db.getFirstAsync<{value:string}>('SELECT value FROM app_settings WHERE key=?',['preference.heightUnit']);const heightUnit=heightSetting?JSON.parse(heightSetting.value) as 'cm'|'ft_in':'cm';if(!r)return{headers:['Name','Date of Birth','Height','Height Unit','Current Weight','Weight Unit','Updated At'],rows:[]};const height=r.height_cm==null?'':heightUnit==='cm'?r.height_cm:(()=>{const h=centimetersToFeetInches(Number(r.height_cm));return `${h.feet} ft ${h.inches} in`;})();return{headers:['Name','Date of Birth','Height','Height Unit','Current Weight','Weight Unit','Updated At'],rows:[[r.name,r.date_of_birth,height,heightUnit,r.current_weight_kg==null?'':kilogramsToDisplay(Number(r.current_weight_kg),weightUnit),weightUnit,r.updated_at]]};}
  if(type==='weight-history'){const rows=await db.getAllAsync<Record<string,unknown>>('SELECT * FROM body_weight_entries ORDER BY measured_at');return{headers:['Entry ID','Date','Weight','Unit','Change From Previous','Notes'],rows:rows.map((r,index)=>[r.id,r.measured_at,kilogramsToDisplay(Number(r.weight_kg),weightUnit),weightUnit,index===0?'':kilogramsToDisplay(Number(r.weight_kg)-Number(rows[index-1].weight_kg),weightUnit),r.notes])};}
  if(type==='body-measurements'){const rows=await db.getAllAsync<Record<string,unknown>>(`SELECT e.*,mt.key,v.value_cm FROM body_measurement_entries e LEFT JOIN body_measurement_values v ON v.entry_id=e.id LEFT JOIN measurement_types mt ON mt.id=v.measurement_type_id ORDER BY e.measured_at,mt.sort_order`);const grouped=new Map<string,Record<string,unknown>>();for(const r of rows){const item=grouped.get(String(r.id))??{...r};if(r.key)item[String(r.key)]=r.value_cm;grouped.set(String(r.id),item)}const unitSetting=await db.getFirstAsync<{value:string}>('SELECT value FROM app_settings WHERE key=?',['preference.bodyMeasurementUnit']);const unit=unitSetting?JSON.parse(unitSetting.value) as 'cm'|'in':'cm';const keys=['chest','waist','hips','left_biceps','right_biceps','left_forearm','right_forearm','left_thigh','right_thigh','left_calf','right_calf'];const show=(v:unknown)=>v==null?'':unit==='in'?centimetersToInches(Number(v)):v;return{headers:['Entry ID','Date','Weight','Chest','Waist','Hips','Left Biceps','Right Biceps','Left Forearm','Right Forearm','Left Thigh','Right Thigh','Left Calf','Right Calf','Unit','Notes'],rows:[...grouped.values()].map(r=>[r.id,r.measured_at,r.body_weight_kg==null?'':kilogramsToDisplay(Number(r.body_weight_kg),weightUnit),...keys.map(key=>show(r[key])),unit,r.notes])};}
  if(type==='exercises'){const rows=await db.getAllAsync<Record<string,unknown>>('SELECT * FROM exercises ORDER BY name');return{headers:['Exercise ID','Name','Category','Primary Muscles','Secondary Muscles','Equipment','Exercise Type','Built In','Archived','Created At'],rows:rows.map(r=>[r.id,r.name,r.category,r.primary_muscles,r.secondary_muscles,r.equipment,r.exercise_type,r.is_builtin,r.is_archived,r.created_at])};}
  if(type==='cardio'){const rows=await db.getAllAsync<Record<string,unknown>>('SELECT * FROM cardio_sessions ORDER BY date');return{headers:['Session ID','Workout ID','Activity Type','Date','Duration Seconds','Distance','Distance Unit','Pace','Average Speed','Average Heart Rate','Maximum Heart Rate','Calories','Elevation Gain','Cadence','Notes'],rows:rows.map(r=>[r.id,r.workout_id,r.activity_type,r.date,r.duration_seconds,r.distance==null?'':kilometersToDisplay(Number(r.distance),distanceUnit),distanceUnit,r.average_pace_seconds_per_unit,r.average_speed,r.average_heart_rate,r.max_heart_rate,r.calories,r.elevation_gain,r.cadence,r.notes])};}
  if(type==='workouts'){const rows=await db.getAllAsync<Record<string,unknown>>(`SELECT w.*,wp.name plan_name,COUNT(DISTINCT we.id) exercise_count,SUM(CASE WHEN ws.completed=1 THEN 1 ELSE 0 END) completed_sets,SUM(CASE WHEN ws.completed=1 THEN COALESCE(ws.reps,0) ELSE 0 END) total_reps,SUM(CASE WHEN ws.completed=1 THEN COALESCE(ws.weight,0)*COALESCE(ws.reps,0) ELSE 0 END) total_volume,(SELECT COALESCE(SUM(duration_seconds),0) FROM cardio_sessions c WHERE c.workout_id=w.id) cardio_duration,(SELECT COALESCE(SUM(distance),0) FROM cardio_sessions c WHERE c.workout_id=w.id) cardio_distance FROM workouts w LEFT JOIN workout_plans wp ON wp.id=w.plan_id LEFT JOIN workout_exercises we ON we.workout_id=w.id LEFT JOIN workout_sets ws ON ws.workout_exercise_id=we.id GROUP BY w.id ORDER BY w.started_at`);return{headers:['Workout ID','Workout Name','Workout Type','Started At','Completed At','Duration','Status','Plan Name','Notes','Exercise Count','Completed Set Count','Total Repetitions','Total Volume','Weight Unit','Cardio Duration','Cardio Distance','Distance Unit'],rows:rows.map(r=>[r.id,r.name,r.workout_type,r.started_at,r.completed_at,r.duration_seconds,r.status,r.plan_name,r.notes,r.exercise_count,r.completed_sets,r.total_reps,kilogramsToDisplay(Number(r.total_volume??0),weightUnit),weightUnit,r.cardio_duration,kilometersToDisplay(Number(r.cardio_distance??0),distanceUnit),distanceUnit])};}
  if(type==='workout-sets'){const rows=await db.getAllAsync<Record<string,unknown>>(`SELECT w.id workout_id,w.name workout_name,w.started_at,e.id exercise_id,e.name exercise_name,e.category,ws.* FROM workout_sets ws JOIN workout_exercises we ON we.id=ws.workout_exercise_id JOIN workouts w ON w.id=we.workout_id JOIN exercises e ON e.id=we.exercise_id ORDER BY w.started_at,we.exercise_order,ws.set_number`);return{headers:['Workout ID','Workout Name','Workout Date','Exercise ID','Exercise Name','Exercise Category','Set ID','Set Number','Set Type','Group Type','Round Number','Stage Number','Weight','Weight Unit','Reps','Duration Seconds','Distance','Distance Unit','RPE','Completed','Notes'],rows:rows.map(r=>[r.workout_id,r.workout_name,r.started_at,r.exercise_id,r.exercise_name,r.category,r.id,r.set_number,r.set_type,r.group_type,r.round_number,r.stage_number,r.weight==null?'':kilogramsToDisplay(Number(r.weight),weightUnit),weightUnit,r.reps,r.duration_seconds,r.distance==null?'':kilometersToDisplay(Number(r.distance),distanceUnit),distanceUnit,r.rpe,r.completed,r.notes])};}
  const rows=await db.getAllAsync<Record<string,unknown>>(`SELECT pr.*,e.name exercise_name,w.name workout_name FROM personal_records pr JOIN exercises e ON e.id=pr.exercise_id JOIN workouts w ON w.id=pr.workout_id ORDER BY pr.achieved_at`);return{headers:['Record ID','Exercise Name','Record Type','Value','Secondary Value','Unit','Achieved At','Workout ID','Workout Name'],rows:rows.map(r=>[r.id,r.exercise_name,r.record_type,r.value,r.secondary_value,weightUnit,r.achieved_at,r.workout_id,r.workout_name])};
}
export async function exportCsv(db:SQLiteDatabase,type:CsvExportType,weightUnit:WeightUnit,distanceUnit:DistanceUnit):Promise<void>{try{const data=await exportRows(db,type,weightUnit,distanceUnit);const file=new File(Paths.cache,`LiftDG-${type}-${dateName()}.csv`);file.create({overwrite:true});file.write(createCsv(data.headers,data.rows));if(!await Sharing.isAvailableAsync())throw new AppError('File sharing is unavailable on this device.');await Sharing.shareAsync(file.uri,{mimeType:'text/csv',dialogTitle:`Export LiftDG ${type}`});}catch(error){throw toAppError(error,'Could not export the CSV file.');}}

export type HydrationCsvExportType = 'water-entries' | 'water-daily-summary';

async function exportHydrationRows(db: SQLiteDatabase, type: HydrationCsvExportType, waterUnit: WaterUnit, currentGoalMl: number): Promise<{ headers: string[]; rows: unknown[][] }> {
  const entries = await getAllWaterEntries(db);
  if (type === 'water-entries') {
    return {
      headers: ['Entry ID', 'Logged At', 'Amount', 'Unit', 'Source', 'Notes'],
      rows: entries.map((entry) => [entry.id, entry.loggedAt, formatServingAmount(entry.amountMl, waterUnit), waterUnit, entry.source, entry.notes]),
    };
  }
  const history = await getGoalHistory(db);
  const resolveGoal = goalResolverFromHistory(history, currentGoalMl);
  const totals = dailyTotalsByKey(entries);
  const dateKeys = Array.from(totals.keys()).sort();
  return {
    headers: ['Date', 'Total', 'Goal', 'Percent', 'Goal Met'],
    rows: dateKeys.map((dateKey) => {
      const total = totals.get(dateKey) ?? 0; const goal = resolveGoal(dateKey);
      return [dateKey, formatWaterVolume(total, waterUnit), formatWaterVolume(goal, waterUnit), goal > 0 ? `${Math.round((total / goal) * 100)}%` : '', total >= goal ? 'Yes' : 'No'];
    }),
  };
}

/** Hydration exports use their own unit (metric/US) rather than the workout weight/distance units. */
export async function exportHydrationCsv(db: SQLiteDatabase, type: HydrationCsvExportType, waterUnit: WaterUnit, currentGoalMl: number): Promise<void> {
  try {
    const data = await exportHydrationRows(db, type, waterUnit, currentGoalMl);
    const file = new File(Paths.cache, `LiftDG-${type}-${dateName()}.csv`);
    file.create({ overwrite: true }); file.write(createCsv(data.headers, data.rows));
    if (!await Sharing.isAvailableAsync()) throw new AppError('File sharing is unavailable on this device.');
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: `Export LiftDG ${type}` });
  } catch (error) { throw toAppError(error, 'Could not export the CSV file.'); }
}
