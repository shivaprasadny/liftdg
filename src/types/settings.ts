import type { BodyMeasurementUnit, HeightUnit } from './body';

export type WeightUnit = 'kg' | 'lb';
export type DistanceUnit = 'km' | 'mi';
export type ThemePreference = 'system' | 'light' | 'dark';
export type FirstDayOfWeek = 0 | 1;

export interface UnitSettings { weightUnit: WeightUnit; distanceUnit: DistanceUnit }
export interface AppearanceSettings { theme: ThemePreference; compactWorkoutLayout: boolean; largerWorkoutControls: boolean }
export interface WorkoutBehaviorSettings {
  defaultWorkoutName: string; defaultRestDuration: number; automaticRestTimer: boolean;
  keepScreenAwake: boolean; confirmDeleteSets: boolean; confirmFinishWorkout: boolean;
  autoFillPreviousSet: boolean; autoStartRestTimer: boolean; defaultSetType: string;
  showRpe: boolean; showNotes: boolean; showPreviousPerformance: boolean;
  vibrationFeedback: boolean; timerSound: boolean;
  openWorkoutInListView: boolean; openFirstIncompleteExercise: boolean;
  autoAdvanceExercise: boolean; enableExerciseSwipeNavigation: boolean; showExercisePosition: boolean;
}
export interface SecuritySettings { appLockEnabled: boolean; lockAfterBackground: boolean; lockDelaySeconds: number }
export interface AppSettings extends UnitSettings, AppearanceSettings, WorkoutBehaviorSettings, SecuritySettings { firstDayOfWeek: FirstDayOfWeek; heightUnit: HeightUnit; bodyMeasurementUnit: BodyMeasurementUnit; showBodyProgressHome: boolean }
export type AppSettingKey = keyof AppSettings;
