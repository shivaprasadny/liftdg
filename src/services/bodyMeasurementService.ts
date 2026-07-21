import { format, isAfter, isValid, parse, parseISO } from 'date-fns';
import { z } from 'zod';

import type { BodyMeasurementEntry, BodyMeasurementEntryInput, MeasurementChartPoint, MeasurementComparison, MeasurementDifference, UserProfileInput } from '@/types/body';
import { AppError } from '@/utils/errors';

const earliestBirthDate = new Date('1900-01-01T00:00:00.000Z');
export function maskDateOfBirthInput(value:string,previous=''):string{let digits=value.replace(/\D/g,'').slice(0,8);if(value.length<previous.length&&previous.endsWith('/')&&!value.endsWith('/'))digits=digits.slice(0,-1);if(digits.length<2)return digits;if(digits.length===2)return`${digits}/`;if(digits.length<4)return`${digits.slice(0,2)}/${digits.slice(2)}`;if(digits.length===4)return`${digits.slice(0,2)}/${digits.slice(2)}/`;return`${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`;}
export function isoDateToDisplay(value:string|null):string{if(!value)return'';const date=parseISO(value);return isValid(date)?format(date,'MM/dd/yyyy'):'';}
export function displayDateToIso(value:string):string{if(!/^\d{2}\/\d{2}\/\d{4}$/.test(value))throw new AppError('Enter date of birth as MM/DD/YYYY.');const date=parse(value,'MM/dd/yyyy',new Date(0));if(!isValid(date)||format(date,'MM/dd/yyyy')!==value)throw new AppError('Enter a valid date of birth.');return format(date,'yyyy-MM-dd');}
export const profileSchema = z.object({ name: z.string().trim().min(1, 'Name is required.').max(80), dateOfBirth: z.string().nullable(), heightCm: z.number().positive().max(300).nullable(), currentWeightKg: z.number().positive().max(1000).nullable(), notes: z.string().max(1000).nullable() });
export const measurementEntrySchema = z.object({ measuredAt: z.string().refine((value) => isValid(parseISO(value)) && !isAfter(parseISO(value), new Date()), 'Measurement date cannot be in the future.'), bodyWeightKg: z.number().positive().max(1000).nullable(), notes: z.string().max(1000).nullable(), values: z.array(z.object({ measurementTypeId: z.string().min(1), valueCm: z.number().positive().max(1000) })).min(1, 'Enter at least one measurement.') }).superRefine((value, context) => { if (new Set(value.values.map((item) => item.measurementTypeId)).size !== value.values.length) context.addIssue({ code: 'custom', message: 'A measurement type can appear only once.' }); });

export function validateDateOfBirth(value: string | null): string | null { if (!value) return null; const date = parseISO(value); if (!isValid(date)) throw new AppError('Enter a valid date of birth.'); if (isAfter(date, new Date())) throw new AppError('Date of birth cannot be in the future.'); if (isAfter(earliestBirthDate, date)) throw new AppError('Date of birth is outside the supported range.'); return value; }
export function calculateAge(dateOfBirth: string, today = new Date()): number { const date = parseISO(dateOfBirth); if (!isValid(date) || isAfter(date, today)) throw new AppError('Enter a valid date of birth.'); const [birthYear,birthMonth,birthDay]=dateOfBirth.split('-').map(Number);const year=today.getUTCFullYear(),month=today.getUTCMonth()+1,day=today.getUTCDate();return year-birthYear-(month<birthMonth||(month===birthMonth&&day<birthDay)?1:0); }
export function validateProfile(input: UserProfileInput): UserProfileInput { validateDateOfBirth(input.dateOfBirth); return profileSchema.parse(input); }
export function validateMeasurementEntry(input: BodyMeasurementEntryInput): BodyMeasurementEntryInput { return measurementEntrySchema.parse(input); }
export const centimetersToFeetInches = (centimeters: number): { feet: number; inches: number } => { const totalInches = centimeters / 2.54; const feet = Math.floor(totalInches / 12); return { feet, inches: Math.round((totalInches - feet * 12) * 10) / 10 }; };
export const feetInchesToCentimeters = (feet: number, inches: number): number => (feet * 12 + inches) * 2.54;
export const centimetersToInches = (value: number): number => value / 2.54;
export const inchesToCentimeters = (value: number): number => value * 2.54;
export const calculateDifference = (current: number, previous: number): { difference: number; percentageChange: number | null } => ({ difference: current - previous, percentageChange: previous > 0 ? ((current - previous) / previous) * 100 : null });
export const averageLeftRight = (left: number | null, right: number | null): number | null => left != null && right != null ? (left + right) / 2 : left ?? right;

export function compareMeasurementEntries(current: BodyMeasurementEntry, previous: BodyMeasurementEntry): MeasurementComparison {
  const previousValues = new Map(previous.values.map((value) => [value.measurementTypeId, value]));
  const differences: MeasurementDifference[] = current.values.flatMap((value) => { const old = previousValues.get(value.measurementTypeId); if (!old) return []; const delta = calculateDifference(value.valueCm, old.valueCm); return [{ measurementTypeId: value.measurementTypeId, displayName: value.measurementType?.displayName ?? old.measurementType?.displayName ?? value.measurementTypeId, currentValue: value.valueCm, previousValue: old.valueCm, ...delta }]; });
  return { currentEntryId: current.id, previousEntryId: previous.id, currentDate: current.measuredAt, previousDate: previous.measuredAt, weightDifferenceKg: current.bodyWeightKg != null && previous.bodyWeightKg != null ? Math.round((current.bodyWeightKg - previous.bodyWeightKg) * 1e10) / 1e10 : null, differences };
}
export function buildMeasurementChartPoints(entries: BodyMeasurementEntry[], measurementTypeId: string, unit: 'cm' | 'in'): MeasurementChartPoint[] { return entries.flatMap((entry) => { const value = entry.values.find((item) => item.measurementTypeId === measurementTypeId); return value ? [{ date: entry.measuredAt, value: unit === 'in' ? centimetersToInches(value.valueCm) : value.valueCm, unit }] : []; }).sort((a, b) => a.date.localeCompare(b.date)); }
