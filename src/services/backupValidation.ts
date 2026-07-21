import { z } from 'zod';
import { backupCollections, type BackupRow, type LiftDGBackup } from '@/types/backup';
import { AppError } from '@/utils/errors';

export const BACKUP_FORMAT_VERSION = 2;
const rowSchema = z.record(z.string(), z.unknown())
  .refine((row) => (typeof row.id === 'string' && row.id.length > 0) || (typeof row.key === 'string' && row.key.length > 0), 'Row requires a valid id or key')
  .refine((row) => Object.entries(row).every(([key,value]) => !key.endsWith('_at') || value === null || (typeof value === 'string' && !Number.isNaN(Date.parse(value)))), 'Row contains an invalid timestamp');
const metadataSchema = z.object({ appName: z.literal('LiftDG'), appVersion: z.string().min(1), databaseVersion: z.number().int().positive(), backupVersion: z.number().int().positive(), exportedAt: z.string().datetime(), devicePlatform: z.string().min(1) });
const dataShape = Object.fromEntries(backupCollections.map((key) => [key, z.array(rowSchema)])) as Record<typeof backupCollections[number], z.ZodArray<typeof rowSchema>>;
const backupSchema = z.object({ metadata: metadataSchema, data: z.object(dataShape) });

function ids(rows: BackupRow[]): Set<string> { return new Set(rows.map((row) => String(row.id ?? ''))); }
export function validateBackup(input: unknown): LiftDGBackup {
  const candidate = input && typeof input === 'object' ? { ...(input as Record<string,unknown>), data: { ...((input as Record<string,unknown>).data as Record<string,unknown> | undefined) } } : input;
  if(candidate&&typeof candidate==='object'){const record=candidate as Record<string,unknown>;const metadata=record.metadata as Record<string,unknown>|undefined;const data=record.data as Record<string,unknown>|undefined;if(metadata?.backupVersion===1&&data)for(const key of ['userProfile','bodyWeightEntries','measurementTypes','bodyMeasurementEntries','bodyMeasurementValues'])data[key]??=[];}
  const parsed = backupSchema.safeParse(candidate);
  if (!parsed.success) throw new AppError(`Invalid LiftDG backup: ${parsed.error.issues[0]?.message ?? 'required data is missing'}.`);
  if (parsed.data.metadata.backupVersion > BACKUP_FORMAT_VERSION) throw new AppError('This backup was created by a newer unsupported backup format.');
  const data = parsed.data.data; const exercises = ids(data.exercises); const plans = ids(data.workoutPlans); const workouts = ids(data.workouts); const planExercises=ids(data.planExercises);const workoutExercises=ids(data.workoutExercises);const planGroups=ids(data.planGroups);const workoutGroups=ids(data.workoutGroups);
  if (data.planExercises.some((row) => !plans.has(String(row.plan_id)) || !exercises.has(String(row.exercise_id)))) throw new AppError('Backup contains invalid plan exercise relationships.');
  if (data.workoutExercises.some((row) => !workouts.has(String(row.workout_id)) || !exercises.has(String(row.exercise_id)))) throw new AppError('Backup contains invalid workout exercise relationships.');
  if(data.workoutSets.some(row=>!workoutExercises.has(String(row.workout_exercise_id))))throw new AppError('Backup contains invalid workout set relationships.');
  if(data.planGroups.some(row=>!plans.has(String(row.plan_id)))||data.planGroupExercises.some(row=>!planGroups.has(String(row.group_id))||!planExercises.has(String(row.plan_exercise_id))))throw new AppError('Backup contains invalid plan group relationships.');
  if(data.workoutGroups.some(row=>!workouts.has(String(row.workout_id)))||data.workoutGroupExercises.some(row=>!workoutGroups.has(String(row.group_id))||!workoutExercises.has(String(row.workout_exercise_id))))throw new AppError('Backup contains invalid workout group relationships.');
  const profiles=ids(data.userProfile),measurementTypes=ids(data.measurementTypes),measurementEntries=ids(data.bodyMeasurementEntries);
  if(data.bodyWeightEntries.some(row=>!profiles.has(String(row.profile_id))))throw new AppError('Backup contains invalid body-weight relationships.');
  if(data.bodyMeasurementEntries.some(row=>!profiles.has(String(row.profile_id))))throw new AppError('Backup contains invalid measurement-entry relationships.');
  if(data.bodyMeasurementValues.some(row=>!measurementEntries.has(String(row.entry_id))||!measurementTypes.has(String(row.measurement_type_id))))throw new AppError('Backup contains invalid body-measurement relationships.');
  return parsed.data as LiftDGBackup;
}
export function parseBackupJson(text: string): LiftDGBackup { try { return validateBackup(JSON.parse(text)); } catch (error) { if (error instanceof AppError) throw error; throw new AppError('The selected file is not valid JSON.'); } }
