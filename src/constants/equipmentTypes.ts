export const equipmentTypes = [
  'Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Resistance Band',
  'Kettlebell', 'Smith Machine', 'Cardio Machine', 'Other',
] as const;

export type EquipmentType = (typeof equipmentTypes)[number];
