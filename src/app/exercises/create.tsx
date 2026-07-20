import { router } from 'expo-router';
import { Alert } from 'react-native';

import { ExerciseForm } from '@/components/ExerciseForm';
import { useDatabase } from '@/hooks/useDatabase';
import { createExercise, findExerciseByName } from '@/repositories/exerciseRepository';
import { getUserMessage } from '@/utils/errors';
import { toExerciseInput } from '@/utils/exerciseForm';
import type { ExerciseFormValues } from '@/utils/validation';

const defaults: ExerciseFormValues = {
  name: '', category: 'Chest', primaryMuscle: '', secondaryMuscles: '',
  equipment: 'Bodyweight', exerciseType: 'strength', instructions: '',
};

export default function CreateExerciseScreen() {
  const db = useDatabase();

  const save = async (values: ExerciseFormValues, allowDuplicate = false): Promise<void> => {
    try {
      if (!allowDuplicate) {
        const duplicate = await findExerciseByName(db, values.name);
        if (duplicate) {
          Alert.alert('Exercise already exists', `“${duplicate.name}” is already in your library. Create another exercise with this name?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Create Anyway', onPress: () => { void save(values, true); } },
          ]);
          return;
        }
      }
      const exercise = await createExercise(db, toExerciseInput(values));
      router.replace({ pathname: '/exercises/[id]', params: { id: exercise.id } });
    } catch (caught) {
      Alert.alert('Could not save exercise', getUserMessage(caught));
    }
  };

  return <ExerciseForm defaultValues={defaults} intro="Create an exercise that will be stored only on this device."
    submitLabel="Create Exercise" onSubmit={save} />;
}
