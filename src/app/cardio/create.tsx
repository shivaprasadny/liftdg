import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { CardioSessionForm } from '@/components/CardioSessionForm';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useDatabase } from '@/hooks/useDatabase';
import { createCardioSession, createStandaloneCardioWorkout } from '@/repositories/cardioRepository';
import { cardioActivityTypes, type CardioActivityType, type CardioSessionInput } from '@/types/cardio';
import { getUserMessage } from '@/utils/errors';

export default function CreateCardioScreen() {
  const { workoutId, activity, quick } = useLocalSearchParams<{ workoutId?: string; activity?: string; quick?: string }>();
  const db = useDatabase();
  const [loading, setLoading] = useState(false);
  const initialActivity: CardioActivityType = cardioActivityTypes.includes(activity as CardioActivityType) ? activity as CardioActivityType : 'running';
  const title = quick === '1' ? initialActivity === 'cycling' ? 'Quick Ride' : initialActivity === 'running' ? 'Quick Run' : 'Quick Cardio' : 'Cardio Session';

  const save = async (input: CardioSessionInput) => {
    try {
      setLoading(true);
      if (workoutId) {
        await createCardioSession(db, { ...input, workoutId });
        Alert.alert('Cardio added');
        router.back();
      } else {
        const id = await createStandaloneCardioWorkout(db, input);
        Alert.alert('Cardio saved');
        router.replace(`/workout/${id}`);
      }
    } catch (error) {
      Alert.alert('Could not save cardio', getUserMessage(error, 'Check your cardio values and try again.'));
    } finally {
      setLoading(false);
    }
  };

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Stack.Screen options={{ title }} />
    <CardioSessionForm onSubmit={save} loading={loading} initialActivity={initialActivity} />
  </ScrollView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, paddingBottom: spacing.xxl } });
