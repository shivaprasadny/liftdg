import type { Exercise } from './exercise';

export const replacementReasons = ['equipment_unavailable','machine_occupied','pain_or_discomfort','injury_or_limitation','too_difficult','too_easy','prefer_another','no_space','time_constraint','travel_gym','home_workout','program_customization','other'] as const;
export type ReplacementReason = typeof replacementReasons[number];
export type ReplacementScope = 'ACTIVE_SESSION'|'SCHEDULED_WORKOUT'|'PROGRAM_WEEK'|'FUTURE_PROGRAM_WEEKS'|'WORKOUT_TEMPLATE'|'PROGRAM_TEMPLATE';
export type SetTransferMode = 'KEEP_SETS_REPS'|'KEEP_SETS_CLEAR_WEIGHT'|'REPLACEMENT_DEFAULTS'|'COPY_PREVIOUS'|'CUSTOM';
export type ReplacementStatus = 'ORIGINAL'|'REPLACED'|'PARTIALLY_REPLACED'|'ADDED'|'REMOVED'|'REVERTED';
export type ReplacementRelationType = 'REGRESSION'|'PROGRESSION'|'EQUIPMENT_ALTERNATIVE'|'SAME_LEVEL_ALTERNATIVE'|'UNILATERAL_VARIANT'|'BILATERAL_VARIANT'|'MACHINE_VARIANT'|'FREE_WEIGHT_VARIANT'|'BODYWEIGHT_VARIANT'|'HOME_VARIANT'|'CUSTOM';

export interface ExerciseReplacementRelation { id:string;sourceExerciseId:string;replacementExerciseId:string;relationType:ReplacementRelationType;priority:number;equipmentContext:string|null;difficultyDelta:number|null;builtIn:boolean;active:boolean; }
export interface EquipmentProfile { id:string;name:string;defaultProfile:boolean;favorite:boolean;temporary:boolean;archived:boolean;lastUsedAt:string|null;equipment:string[]; }
export interface ExerciseRestriction { id:string;exerciseId:string;restrictionType:'avoid'|'do_not_recommend'|'favorite'|'preferred'|'requires_caution'|'temporarily_unavailable';reason:string|null;active:boolean;expiresAt:string|null; }
export interface ExerciseRecommendation { exercise:Exercise;score:number;reasons:string[];category:'Best Match'|'Same Movement Pattern'|'Same Primary Muscle'|'Equipment Alternative'|'Other'; }
export interface ReplacementRequest { operationId:string;sourceContext:'active_session'|'scheduled_workout'|'workout_template'|'program_template';sourceId:string;workoutExerciseId?:string;replacementExerciseId:string;scope:ReplacementScope;reason:ReplacementReason|null;transferMode:SetTransferMode; }
export interface ReplacementResult { auditId:string;replacementWorkoutExerciseId:string|null;affectedCount:number;excludedCount:number;partial:boolean; }
