export const exerciseCategories = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quadriceps', 'Hamstrings',
  'Glutes', 'Calves', 'Legs', 'Core', 'Full Body', 'Cardio', 'Mobility', 'Yoga',
] as const;

export type ExerciseCategory = (typeof exerciseCategories)[number];
