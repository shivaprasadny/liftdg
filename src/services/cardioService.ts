import type { CardioSession, CardioSessionInput, CardioSessionSummary } from '@/types/cardio';
import type { ActiveWorkout, WorkoutType } from '@/types/workout';
import { AppError } from '../utils/errors';

export const milesToKilometers = (miles: number) => miles * 1.609344;
export const kilometersToMiles = (kilometers: number) => kilometers / 1.609344;
/** Pace is seconds per canonical kilometer and exists only with positive duration and distance. */
export function calculatePace(durationSeconds: number, distanceKm: number | null): number | null { return durationSeconds > 0 && (distanceKm ?? 0) > 0 ? Math.round(durationSeconds / (distanceKm as number)) : null; }
export function calculateAverageSpeed(durationSeconds: number, distanceKm: number | null): number | null { return durationSeconds > 0 && (distanceKm ?? 0) > 0 ? (distanceKm as number) / (durationSeconds / 3600) : null; }
export function validateCardioInput(input: CardioSessionInput): CardioSessionInput { if (input.durationSeconds <= 0) throw new AppError('Duration must be greater than zero.'); if ((input.distanceKm ?? 0) < 0 || (input.averageHeartRate ?? 0) < 0 || (input.maxHeartRate ?? 0) < 0 || (input.calories ?? 0) < 0 || (input.elevationGain ?? 0) < 0 || (input.cadence ?? 0) < 0) throw new AppError('Cardio values cannot be negative.'); return input; }
export function summarizeCardio(sessions: CardioSession[]): CardioSessionSummary { const duration = sessions.reduce((sum, item) => sum + item.durationSeconds, 0); const distance = sessions.reduce((sum, item) => sum + (item.distanceKm ?? 0), 0); const paced = sessions.filter((item) => item.averagePaceSecondsPerKm !== null); return { sessionCount: sessions.length, totalDurationSeconds: duration, totalDistanceKm: distance, averageDurationSeconds: sessions.length ? duration / sessions.length : 0, averageDistanceKm: sessions.length ? distance / sessions.length : 0, averagePaceSecondsPerKm: distance > 0 ? duration / distance : null, longestDurationSeconds: Math.max(0, ...sessions.map((item) => item.durationSeconds)), longestDistanceKm: Math.max(0, ...sessions.map((item) => item.distanceKm ?? 0)), fastestPaceSecondsPerKm: paced.length ? Math.min(...paced.map((item) => item.averagePaceSecondsPerKm as number)) : null }; }
/** Content wins over a manually selected type: strength plus cardio is always mixed. */
export function deriveWorkoutType(workout: Pick<ActiveWorkout, 'exercises'>, cardioCount: number): WorkoutType { const strength = workout.exercises.some((item) => item.sets.length > 0); return strength && cardioCount > 0 ? 'mixed' : cardioCount > 0 ? 'cardio' : 'strength'; }
/** Lower pace wins; short samples below 0.5 km never create a fastest-pace record. */
export function isFasterPace(candidateSecondsPerKm: number, distanceKm: number, bestSecondsPerKm: number | null): boolean { return distanceKm >= 0.5 && candidateSecondsPerKm > 0 && (bestSecondsPerKm === null || candidateSecondsPerKm < bestSecondsPerKm); }
