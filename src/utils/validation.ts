import { z } from 'zod';

import { equipmentTypes } from '@/constants/equipmentTypes';
import { exerciseCategories } from '@/constants/exerciseCategories';
import { exerciseTypes } from '@/types/exercise';

export const exerciseFormSchema = z.object({
  name: z.string().trim().min(1, 'Exercise name is required').max(80),
  category: z.enum(exerciseCategories),
  primaryMuscle: z.string().trim().min(1, 'Primary muscle is required').max(80),
  secondaryMuscles: z.string().max(250),
  equipment: z.enum(equipmentTypes),
  exerciseType: z.enum(exerciseTypes),
  instructions: z.string().max(2000),
});

export type ExerciseFormValues = z.infer<typeof exerciseFormSchema>;
