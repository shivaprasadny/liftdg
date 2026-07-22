import { format, isValid, parse, parseISO } from 'date-fns';

import type { CardioSession, CardioSessionInput, CardioSessionSummary } from '@/types/cardio';
import type { ActiveWorkout, WorkoutType } from '@/types/workout';
import { AppError } from '../utils/errors';

const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Same auto-slash masking as the date-of-birth input (see bodyMeasurementService), reused here for a start date. */
export function maskCardioDateInput(value: string, previous = ''): string {
  let digits = value.replace(/\D/g, '').slice(0, 8);
  if (value.length < previous.length && previous.endsWith('/') && !value.endsWith('/')) digits = digits.slice(0, -1);
  if (digits.length < 2) return digits;
  if (digits.length === 2) return `${digits}/`;
  if (digits.length < 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  if (digits.length === 4) return `${digits.slice(0, 2)}/${digits.slice(2)}/`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
/** Auto-inserts the ":" after the hour digits of a 24-hour HH:MM entry. */
export function maskCardioTimeInput(value: string, previous = ''): string {
  let digits = value.replace(/\D/g, '').slice(0, 4);
  if (value.length < previous.length && previous.endsWith(':') && !value.endsWith(':')) digits = digits.slice(0, -1);
  if (digits.length < 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}
/** Splits a stored ISO instant into the two display fields shown in the form; blank if unparseable. */
export function isoToCardioDateTimeDisplay(value: string): { date: string; time: string } {
  const parsed = parseISO(value);
  if (!isValid(parsed)) return { date: '', time: '' };
  return { date: format(parsed, 'MM/dd/yyyy'), time: format(parsed, 'HH:mm') };
}
/** Combines the two masked display fields back into a canonical ISO instant for storage. */
export function cardioDateTimeDisplayToIso(dateDisplay: string, timeDisplay: string): string {
  if (!datePattern.test(dateDisplay)) throw new AppError('Enter the start date as MM/DD/YYYY.');
  if (!timePattern.test(timeDisplay)) throw new AppError('Enter the start time as HH:MM (24-hour).');
  const parsed = parse(`${dateDisplay} ${timeDisplay}`, 'MM/dd/yyyy HH:mm', new Date());
  if (!isValid(parsed) || format(parsed, 'MM/dd/yyyy HH:mm') !== `${dateDisplay} ${timeDisplay}`) throw new AppError('Enter a valid start date and time.');
  return parsed.toISOString();
}

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
