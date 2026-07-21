export type HeightUnit = 'cm' | 'ft_in';
export type BodyMeasurementUnit = 'cm' | 'in';

export interface UserProfile { id: string; name: string; dateOfBirth: string | null; heightCm: number | null; currentWeightKg: number | null; notes: string | null; createdAt: string; updatedAt: string }
export interface UserProfileInput { name: string; dateOfBirth: string | null; heightCm: number | null; currentWeightKg: number | null; notes: string | null }
export interface BodyWeightEntry { id: string; profileId: string; weightKg: number; measuredAt: string; notes: string | null; createdAt: string; updatedAt: string }
export interface BodyWeightEntryInput { weightKg: number; measuredAt: string; notes: string | null }
export interface MeasurementType { id: string; key: string; displayName: string; category: string; defaultUnit: 'cm'; isBuiltin: boolean; isActive: boolean; sortOrder: number; createdAt: string; updatedAt: string }
export interface BodyMeasurementValue { id: string; entryId: string; measurementTypeId: string; valueCm: number; createdAt: string; updatedAt: string; measurementType?: MeasurementType }
export interface BodyMeasurementEntry { id: string; profileId: string; measuredAt: string; bodyWeightKg: number | null; notes: string | null; createdAt: string; updatedAt: string; values: BodyMeasurementValue[] }
export interface BodyMeasurementEntryInput { measuredAt: string; bodyWeightKg: number | null; notes: string | null; values: { measurementTypeId: string; valueCm: number }[] }
export interface MeasurementDifference { measurementTypeId: string; displayName: string; currentValue: number; previousValue: number; difference: number; percentageChange: number | null }
export interface MeasurementComparison { currentEntryId: string; previousEntryId: string; currentDate: string; previousDate: string; weightDifferenceKg: number | null; differences: MeasurementDifference[] }
export interface MeasurementChartPoint { date: string; value: number; unit: BodyMeasurementUnit }
export interface MeasurementPreference { measurementTypeId: string; isActive: boolean }
