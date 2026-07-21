import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_VERSION } from '@/database/schema';
import { setSetting } from '@/repositories/settingsRepository';
import { BACKUP_FORMAT_VERSION, parseBackupJson, validateBackup } from '@/services/backupValidation';
import { backupCollections, type BackupCollection, type BackupData, type BackupRow, type BackupSummary, type LiftDGBackup, type RestoreMode, type RestoreResult } from '@/types/backup';
import { AppError, toAppError } from '@/utils/errors';

const tables: Record<BackupCollection, string> = { settings:'app_settings',exercises:'exercises',workoutPlans:'workout_plans',planExercises:'plan_exercises',planGroups:'plan_groups',planGroupExercises:'plan_group_exercises',workouts:'workouts',workoutExercises:'workout_exercises',workoutSets:'workout_sets',workoutGroups:'workout_groups',workoutGroupExercises:'workout_group_exercises',cardioSessions:'cardio_sessions',personalRecords:'personal_records',cardioPersonalRecords:'cardio_personal_records',userProfile:'user_profile',bodyWeightEntries:'body_weight_entries',measurementTypes:'measurement_types',bodyMeasurementEntries:'body_measurement_entries',bodyMeasurementValues:'body_measurement_values' };
const insertOrder: BackupCollection[] = ['settings','exercises','workoutPlans','planExercises','planGroups','planGroupExercises','workouts','workoutExercises','workoutSets','workoutGroups','workoutGroupExercises','cardioSessions','personalRecords','cardioPersonalRecords','userProfile','bodyWeightEntries','measurementTypes','bodyMeasurementEntries','bodyMeasurementValues'];
// Built-in measurement types survive replace restores, allowing format-1 backups to remain valid.
const deleteOrder = [...insertOrder].reverse().filter(key=>key!=='measurementTypes');
function stamp(): string { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`; }

export async function buildBackup(db: SQLiteDatabase): Promise<LiftDGBackup> {
  const data = {} as BackupData;
  for (const key of backupCollections) data[key] = await db.getAllAsync<BackupRow>(`SELECT * FROM ${tables[key]}`);
  return validateBackup({ metadata: { appName:'LiftDG', appVersion:Constants.expoConfig?.version ?? '1.0.0', databaseVersion:DATABASE_VERSION, backupVersion:BACKUP_FORMAT_VERSION, exportedAt:new Date().toISOString(), devicePlatform:Platform.OS }, data });
}
export function summarizeBackup(backup: LiftDGBackup): BackupSummary { return { exercises:backup.data.exercises.length,plans:backup.data.workoutPlans.length,workouts:backup.data.workouts.length,sets:backup.data.workoutSets.length,cardioSessions:backup.data.cardioSessions.length,settings:backup.data.settings.length,profiles:backup.data.userProfile.length,measurementEntries:backup.data.bodyMeasurementEntries.length }; }
export async function writeBackupFile(backup: LiftDGBackup, prefix = 'LiftDG-backup'): Promise<File> { const file = new File(Paths.cache, `${prefix}-${stamp()}.json`); file.create({ overwrite:true }); file.write(JSON.stringify(backup, null, 2)); return file; }
export async function createAndShareBackup(db: SQLiteDatabase): Promise<void> { try { const file = await writeBackupFile(await buildBackup(db)); if (!await Sharing.isAvailableAsync()) throw new AppError('File sharing is unavailable on this device.'); await Sharing.shareAsync(file.uri,{ mimeType:'application/json',dialogTitle:'Export LiftDG backup' }); await setSetting(db,'preference.lastBackupAt',JSON.stringify(new Date().toISOString())); } catch(error){ throw toAppError(error,'Could not create the backup.'); } }
export async function pickBackup(): Promise<LiftDGBackup | null> { const result=await DocumentPicker.getDocumentAsync({type:'application/json',copyToCacheDirectory:true}); if(result.canceled)return null; return parseBackupJson(await new File(result.assets[0].uri).text()); }

async function insertRow(db: SQLiteDatabase, table: string, row: BackupRow, mode: RestoreMode): Promise<'inserted'|'updated'|'skipped'> {
  const allowed=new Set((await db.getAllAsync<{name:string}>(`PRAGMA table_info(${table})`)).map(column=>column.name));
  const columns=Object.keys(row); if(columns.length===0||columns.some(column=>!allowed.has(column))) throw new AppError(`Backup contains unsupported columns for ${table}.`);
  const key=typeof row.id==='string'?'id':'key'; const keyValue=row[key]; if(typeof keyValue!=='string') return 'skipped'; const existing=await db.getFirstAsync<Record<string,unknown>>(`SELECT * FROM ${table} WHERE ${key} = ?`,[keyValue]);
  if(existing && mode==='merge') {
    const incomingTime=String(row.updated_at ?? ''); const existingTime=String(existing.updated_at ?? '');
    if(!incomingTime || incomingTime<=existingTime) return 'skipped';
  }
  if(existing){const changed=columns.filter(column=>column!==key);await db.runAsync(`UPDATE ${table} SET ${changed.map(column=>`${column}=?`).join(',')} WHERE ${key}=?`,[...changed.map(column=>row[column] as string|number|null),keyValue]);return'updated';}
  await db.runAsync(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(()=>'?').join(',')})`,columns.map((column)=>row[column] as string|number|null));return'inserted';
}

/** Parent-first restore plus one exclusive transaction prevents partially connected aggregates. */
export async function restoreBackup(db: SQLiteDatabase, backupInput: unknown, mode: RestoreMode): Promise<RestoreResult> {
  const backup=validateBackup(backupInput); const result:RestoreResult={inserted:0,updated:0,skipped:0,failed:0};
  try { await db.withExclusiveTransactionAsync(async(transaction)=>{
    if(mode==='replace') for(const key of deleteOrder) await transaction.runAsync(`DELETE FROM ${tables[key]}`);
    for(const key of insertOrder) for(const row of backup.data[key]) { const outcome=await insertRow(transaction,tables[key],row,mode); result[outcome]+=1; }
    const integrity=await transaction.getFirstAsync<{integrity_check:string}>('PRAGMA integrity_check'); if(integrity?.integrity_check!=='ok') throw new AppError('Database integrity check failed; restore was rolled back.');
  }); return result; } catch(error){ throw toAppError(error,'Restore failed. Your existing data was preserved.'); }
}

/** The caller stores this file before confirmation, giving destructive restores a recovery point. */
export async function createPreRestoreBackup(db: SQLiteDatabase): Promise<File> { return writeBackupFile(await buildBackup(db),'LiftDG-pre-restore'); }
