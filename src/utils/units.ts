import type { DistanceUnit, WeightUnit } from '@/types/settings';

const LB_PER_KG = 2.2046226218487757;
const MI_PER_KM = 0.621371192237334;
export function kilogramsToDisplay(valueKg: number, unit: WeightUnit): number { return unit === 'lb' ? valueKg * LB_PER_KG : valueKg; }
export function displayToKilograms(value: number, unit: WeightUnit): number { return unit === 'lb' ? value / LB_PER_KG : value; }
export function kilometersToDisplay(valueKm: number, unit: DistanceUnit): number { return unit === 'mi' ? valueKm * MI_PER_KM : valueKm; }
export function displayToKilometers(value: number, unit: DistanceUnit): number { return unit === 'mi' ? value / MI_PER_KM : value; }
export function formatWeight(valueKg: number, unit: WeightUnit): string { return `${kilogramsToDisplay(valueKg, unit).toFixed(1)} ${unit}`; }
export function formatDistance(valueKm: number, unit: DistanceUnit): string { return `${kilometersToDisplay(valueKm, unit).toFixed(2)} ${unit}`; }

