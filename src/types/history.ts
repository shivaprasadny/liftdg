export type WorkoutHistoryView='list'|'calendar'|'timeline';
export interface HistoryCorrectionInput{workoutId:string;displayName:string;notes:string|null;correctedLocalDate:string|null;reason:string;operationId:string;}
export interface HistoryCorrectionAudit{id:string;completedWorkoutId:string;fieldName:string;oldValue:unknown;newValue:unknown;reason:string;createdAt:string;}
export interface HistoryCalendarDay{dateKey:string;workoutCount:number;workoutTypes:string[];partialCount:number;emptyCount:number;personalRecordCount:number;}
export interface HistoryTimelineGroup{title:string;workoutCount:number;durationSeconds:number;personalRecordCount:number;workoutIds:string[];}
