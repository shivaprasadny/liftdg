import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { FilterChip } from '@/components/FilterChip';
import { colors } from '@/constants/colors';
import { equipmentTypes } from '@/constants/equipmentTypes';
import { exerciseCategories } from '@/constants/exerciseCategories';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useDatabase } from '@/hooks/useDatabase';
import { createExercise, findExerciseByName } from '@/repositories/exerciseRepository';
import { exerciseTypes } from '@/types/exercise';
import { getUserMessage } from '@/utils/errors';
import { exerciseFormSchema, type ExerciseFormValues } from '@/utils/validation';

const defaults: ExerciseFormValues = { name: '', category: 'Chest', primaryMuscle: '',
  secondaryMuscles: '', equipment: 'Bodyweight', exerciseType: 'strength', instructions: '' };

export default function CreateExerciseScreen() {
  const db = useDatabase();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema), defaultValues: defaults,
  });
  const save = async (values: ExerciseFormValues, allowDuplicate = false): Promise<void> => {
    try {
      if (!allowDuplicate) {
        const duplicate = await findExerciseByName(db, values.name);
        if (duplicate) {
          Alert.alert('Exercise already exists', `“${duplicate.name}” is already in your library. Create another exercise with this name?`, [
            { text: 'Cancel', style: 'cancel' }, { text: 'Create Anyway', onPress: () => { void save(values, true); } },
          ]); return;
        }
      }
      const exercise = await createExercise(db, {
        name: values.name, category: values.category, primaryMuscles: [values.primaryMuscle.trim()],
        secondaryMuscles: values.secondaryMuscles.split(',').map((item) => item.trim()).filter(Boolean),
        equipment: values.equipment, exerciseType: values.exerciseType,
        instructions: values.instructions.split('\n').map((item) => item.trim()).filter(Boolean),
      });
      router.replace({ pathname: '/exercises/[id]', params: { id: exercise.id } });
    } catch (caught) { Alert.alert('Could not save exercise', getUserMessage(caught)); }
  };
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.intro}>Create an exercise that will be stored only on this device.</Text>
    <Controller control={control} name="name" render={({ field: { onChange, onBlur, value } }) =>
      <AppInput label="Exercise name" placeholder="e.g. Landmine Press" autoCapitalize="words" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />} />
    <Choice control={control} name="category" label="Category" values={exerciseCategories} />
    <Controller control={control} name="primaryMuscle" render={({ field: { onChange, onBlur, value } }) =>
      <AppInput label="Primary muscle" placeholder="e.g. Chest" autoCapitalize="words" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.primaryMuscle?.message} />} />
    <Controller control={control} name="secondaryMuscles" render={({ field: { onChange, onBlur, value } }) =>
      <AppInput label="Secondary muscles (optional)" placeholder="Triceps, Front Deltoids" autoCapitalize="words" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.secondaryMuscles?.message} />} />
    <Choice control={control} name="equipment" label="Equipment" values={equipmentTypes} />
    <Choice control={control} name="exerciseType" label="Exercise type" values={exerciseTypes} format={(value) => value[0].toUpperCase() + value.slice(1)} />
    <Controller control={control} name="instructions" render={({ field: { onChange, onBlur, value } }) =>
      <AppInput label="Instructions (optional)" placeholder="Add one step per line" multiline value={value} onChangeText={onChange} onBlur={onBlur} error={errors.instructions?.message} />} />
    <AppButton label="Create Exercise" loading={isSubmitting} onPress={handleSubmit((values) => save(values))} />
  </ScrollView>;
}

type FormControl = ReturnType<typeof useForm<ExerciseFormValues>>['control'];
type ChoiceName = 'category' | 'equipment' | 'exerciseType';
function Choice<T extends string>({ control, name, label, values, format = (value) => value }:
  { control: FormControl; name: ChoiceName; label: string; values: readonly T[]; format?: (value: T) => string }) {
  return <View style={styles.choice}><Text style={styles.label}>{label}</Text>
    <Controller control={control} name={name} render={({ field: { value, onChange } }) =>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {values.map((item) => <FilterChip key={item} label={format(item)} selected={value === item} onPress={() => onChange(item)} />)}
      </ScrollView>} />
  </View>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  intro: { ...typography.body, color: colors.textMuted }, choice: { gap: spacing.sm }, label: { ...typography.label, color: colors.text }, chips: { gap: spacing.sm, paddingRight: spacing.lg } });
