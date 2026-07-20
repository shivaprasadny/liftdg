import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { ExerciseForm } from '@/components/ExerciseForm';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { useDatabase } from '@/hooks/useDatabase';
import { findExerciseByName, getExerciseById, updateExercise } from '@/repositories/exerciseRepository';
import type { Exercise } from '@/types/exercise';
import { getUserMessage } from '@/utils/errors';
import { toExerciseInput } from '@/utils/exerciseForm';
import type { ExerciseFormValues } from '@/utils/validation';

export default function EditExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDatabase();
  const [exercise, setExercise] = useState<Exercise | null>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    void (async () => {
      try {
        if (!id) throw new Error('Exercise ID is missing');
        const found = await getExerciseById(db, id);
        if (!found || found.isBuiltin) throw new Error('Built-in exercises cannot be edited');
        setExercise(found);
      } catch (caught) {
        setError(getUserMessage(caught, 'This exercise cannot be edited.'));
      }
    })();
  }, [db, id]);

  if (exercise === undefined && !error) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }
  if (!exercise || error) {
    return <View style={styles.center}><Text style={styles.error}>{error ?? 'Exercise not found.'}</Text></View>;
  }

  const save = async (values: ExerciseFormValues, allowDuplicate = false): Promise<void> => {
    try {
      if (!allowDuplicate) {
        const duplicate = await findExerciseByName(db, values.name, exercise.id);
        if (duplicate) {
          Alert.alert('Exercise already exists', `“${duplicate.name}” already uses this name. Save anyway?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Save Anyway', onPress: () => { void save(values, true); } },
          ]);
          return;
        }
      }
      await updateExercise(db, exercise.id, toExerciseInput(values));
      router.replace({ pathname: '/exercises/[id]', params: { id: exercise.id } });
    } catch (caught) {
      Alert.alert('Could not update exercise', getUserMessage(caught));
    }
  };

  const defaults: ExerciseFormValues = {
    name: exercise.name, category: exercise.category,
    primaryMuscle: exercise.primaryMuscles[0] ?? '',
    secondaryMuscles: exercise.secondaryMuscles.join(', '), equipment: exercise.equipment,
    exerciseType: exercise.exerciseType, instructions: exercise.instructions.join('\n'),
  };
  return <ExerciseForm defaultValues={defaults} intro="Update this custom exercise. Existing workout history will remain unchanged."
    submitLabel="Save Changes" onSubmit={save} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  error: { ...typography.body, color: colors.danger },
});
