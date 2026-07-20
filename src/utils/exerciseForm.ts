import type { CreateExerciseInput } from '@/types/exercise';
import type { ExerciseFormValues } from './validation';

export function toExerciseInput(values: ExerciseFormValues): CreateExerciseInput {
  return {
    name: values.name, category: values.category,
    primaryMuscles: [values.primaryMuscle.trim()],
    secondaryMuscles: values.secondaryMuscles.split(',').map((item) => item.trim()).filter(Boolean),
    equipment: values.equipment, exerciseType: values.exerciseType,
    instructions: values.instructions.split('\n').map((item) => item.trim()).filter(Boolean),
  };
}
