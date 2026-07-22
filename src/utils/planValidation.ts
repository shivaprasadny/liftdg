import { z } from 'zod';

import { workoutPlanTypes } from '@/constants/workoutPlanTypes';

export const planExerciseSchema = z.object({
  exerciseId: z.string().min(1), exerciseOrder: z.number().int().nonnegative(),
  targetSets: z.number().int().min(1, 'Sets must be at least 1').max(20, 'Sets cannot exceed 20').nullable(),
  targetRepsMin: z.number().int().min(1, 'Minimum reps must be at least 1').nullable(),
  targetRepsMax: z.number().int().min(1, 'Maximum reps must be at least 1').nullable(),
  targetWeight: z.number().nonnegative('Weight cannot be negative').nullable(),
  restSeconds: z.number().int().nonnegative('Rest time cannot be negative').nullable(),
  notes: z.string().max(500).nullable(),
}).refine((value) => value.targetRepsMin == null || value.targetRepsMax == null || value.targetRepsMax >= value.targetRepsMin,
  { message: 'Maximum reps cannot be less than minimum reps', path: ['targetRepsMax'] });

export const workoutPlanSchema = z.object({
  name: z.string().trim().min(2, 'Plan name must be at least 2 characters').max(80),
  description: z.string().trim().max(500).nullable(), color: z.string().nullable(),
  workoutType: z.enum(workoutPlanTypes),
  exercises: z.array(planExerciseSchema).min(1, 'Add at least one exercise'),
});

export const planMetadataSchema = z.object({
  name: z.string().trim().min(2, 'Plan name must be at least 2 characters').max(80),
  description: z.string().max(500),
});

export type PlanMetadataValues = z.infer<typeof planMetadataSchema>;
