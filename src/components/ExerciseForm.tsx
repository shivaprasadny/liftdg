import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm, type Control } from 'react-hook-form';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { equipmentTypes } from '@/constants/equipmentTypes';
import { exerciseCategories } from '@/constants/exerciseCategories';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { exerciseTypes } from '@/types/exercise';
import { exerciseFormSchema, type ExerciseFormValues } from '@/utils/validation';

import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { FilterChip } from './FilterChip';

interface Props {
  defaultValues: ExerciseFormValues;
  intro: string;
  submitLabel: string;
  onSubmit: (values: ExerciseFormValues) => Promise<void>;
}

export function ExerciseForm({ defaultValues, intro, submitLabel, onSubmit }: Props) {
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema), defaultValues,
  });

  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.intro}>{intro}</Text>
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
    <AppButton label={submitLabel} loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
  </ScrollView>;
}

type ChoiceName = 'category' | 'equipment' | 'exerciseType';
function Choice<T extends string>({ control, name, label, values, format = (value) => value }:
  { control: Control<ExerciseFormValues>; name: ChoiceName; label: string; values: readonly T[]; format?: (value: T) => string }) {
  return <View style={styles.choice}><Text style={styles.label}>{label}</Text>
    <Controller control={control} name={name} render={({ field: { value, onChange } }) =>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {values.map((item) => <FilterChip key={item} label={format(item)} selected={value === item} onPress={() => onChange(item)} />)}
      </ScrollView>} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  intro: { ...typography.body, color: colors.textMuted }, choice: { gap: spacing.sm },
  label: { ...typography.label, color: colors.text }, chips: { gap: spacing.sm, paddingRight: spacing.lg },
});
