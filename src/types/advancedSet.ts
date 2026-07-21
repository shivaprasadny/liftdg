import type { SetType } from './workout';
interface BaseAdvancedSet { setType: SetType; completed: boolean; rpe: number | null; notes: string | null; }
export interface DropSetStage extends BaseAdvancedSet { setType: 'drop'; groupId: string; stageNumber: number; weight: number; reps: number; }
export interface RestPauseStage extends BaseAdvancedSet { setType: 'rest_pause'; groupId: string; stageNumber: number; weight: number; reps: number; restSeconds: number; }
export interface TimedSet extends BaseAdvancedSet { setType: 'timed'; durationSeconds: number; weight: number | null; distanceKm: number | null; }
export interface AssistedSet extends BaseAdvancedSet { setType: 'assisted'; reps: number; assistanceWeightKg: number; }
export interface BodyweightSet extends BaseAdvancedSet { setType: 'bodyweight'; reps: number; bodyweightKg: number | null; addedWeightKg: number | null; assistanceWeightKg: number | null; }
export type AmrapSet = BaseAdvancedSet & ({ setType: 'amrap'; mode: 'repetitions'; weight: number | null; reps: number; timeLimitSeconds: number | null } | { setType: 'amrap'; mode: 'time'; durationSeconds: number; rounds: number; additionalReps: number });
export type AdvancedSetType = DropSetStage | RestPauseStage | TimedSet | AssistedSet | BodyweightSet | AmrapSet;
export type SetInput = { kind: 'strength'; weight: number | null; reps: number } | { kind: 'timed'; durationSeconds: number; weight: number | null; distanceKm: number | null } | { kind: 'distance'; distanceKm: number; durationSeconds: number | null } | { kind: 'assisted'; reps: number; assistanceWeightKg: number } | { kind: 'bodyweight'; reps: number; addedWeightKg: number | null; assistanceWeightKg: number | null };
export interface MixedWorkoutSummary { strengthSetCount: number; strengthVolumeKg: number; totalRepetitions: number; cardioSessionCount: number; cardioDurationSeconds: number; cardioDistanceKm: number; dropSetGroupCount: number; supersetCount: number; circuitRounds: number; }
