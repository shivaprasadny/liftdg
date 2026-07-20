export const exerciseCategories = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quadriceps', 'Hamstrings',
  'Glutes', 'Calves', 'Core', 'Full Body', 'Cardio', 'Mobility',
] as const;

export type ExerciseCategory = (typeof exerciseCategories)[number];
