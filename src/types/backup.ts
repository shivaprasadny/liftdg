export type RestoreMode = 'replace' | 'merge';
export type BackupRow = Record<string, unknown>;
export interface BackupMetadata { appName: 'LiftDG'; appVersion: string; databaseVersion: number; backupVersion: number; exportedAt: string; devicePlatform: string }
export const backupCollections = ['settings','exercises','workoutPlans','planExercises','planGroups','planGroupExercises','workouts','workoutExercises','workoutSets','workoutGroups','workoutGroupExercises','cardioSessions','personalRecords','cardioPersonalRecords','userProfile','bodyWeightEntries','measurementTypes','bodyMeasurementEntries','bodyMeasurementValues'] as const;
export type BackupCollection = typeof backupCollections[number];
export type BackupData = Record<BackupCollection, BackupRow[]>;
export interface LiftDGBackup { metadata: BackupMetadata; data: BackupData }
export interface RestoreResult { inserted: number; updated: number; skipped: number; failed: number }
export interface BackupSummary { exercises: number; plans: number; workouts: number; sets: number; cardioSessions: number; settings: number; profiles:number; measurementEntries:number }
