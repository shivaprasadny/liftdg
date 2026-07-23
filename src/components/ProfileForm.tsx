import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { FilterChip } from './FilterChip';
import { spacing } from '@/constants/spacing';
import { centimetersToFeetInches, displayDateToIso, feetInchesToCentimeters, isoDateToDisplay, maskDateOfBirthInput } from '@/services/bodyMeasurementService';
import type { HeightUnit, UserProfileInput } from '@/types/body';
import type { WeightUnit } from '@/types/settings';
import { displayToKilograms, kilogramsToDisplay } from '@/utils/units';

const formSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  dateOfBirth: z.string().refine((value) => { if (!value) return true; try { displayDateToIso(value); return true; } catch { return false; } }, 'Enter a valid date as MM/DD/YYYY.'),
  height: z.string(), feet: z.string(), inches: z.string(), weight: z.string(), notes: z.string(),
});
type Form = z.infer<typeof formSchema>;

interface Props { initial?: UserProfileInput; heightUnit: HeightUnit; weightUnit: WeightUnit; onUnitChange?: (height: HeightUnit, weight: WeightUnit) => void; onSubmit: (input: UserProfileInput) => Promise<void>; submitLabel?: string; showNotes?: boolean }

export function ProfileForm({ initial, heightUnit, weightUnit, onUnitChange, onSubmit, submitLabel = 'Save profile', showNotes = true }: Props) {
  const height = initial?.heightCm != null ? centimetersToFeetInches(initial.heightCm) : null;
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(formSchema), defaultValues: {
    name: initial?.name ?? '', dateOfBirth: isoDateToDisplay(initial?.dateOfBirth ?? null),
    height: initial?.heightCm != null ? String(initial.heightCm) : '', feet: height ? String(height.feet) : '', inches: height ? String(height.inches) : '',
    weight: initial?.currentWeightKg != null ? String(kilogramsToDisplay(initial.currentWeightKg, weightUnit)) : '', notes: initial?.notes ?? '',
  } });
  const input = (name: keyof Form, label: string, props: Record<string, unknown> = {}) => <Controller control={control} name={name} render={({ field }) => <AppInput accessibilityLabel={label} label={label} value={field.value} onBlur={field.onBlur} onChangeText={field.onChange} error={errors[name]?.message} {...props} />} />;
  const save = handleSubmit(async (value) => {
    const numeric = (text: string) => text.trim() ? Number(text) : null;
    const heightCm = heightUnit === 'cm' ? numeric(value.height) : numeric(value.feet) != null || numeric(value.inches) != null ? feetInchesToCentimeters(numeric(value.feet) ?? 0, numeric(value.inches) ?? 0) : null;
    const shownWeight = numeric(value.weight);
    await onSubmit({ name: value.name, dateOfBirth: value.dateOfBirth ? displayDateToIso(value.dateOfBirth) : null, heightCm, currentWeightKg: shownWeight == null ? null : displayToKilograms(shownWeight, weightUnit), notes: value.notes.trim() || null });
  });
  return <View style={styles.wrap}>
    {input('name', 'Name')}
    <Controller control={control} name="dateOfBirth" render={({ field }) => <AppInput accessibilityLabel="Date of birth, month day year" label="Date of birth" placeholder="MM/DD/YYYY" keyboardType="number-pad" maxLength={10} value={field.value} onBlur={field.onBlur} onChangeText={(value) => field.onChange(maskDateOfBirthInput(value,field.value))} error={errors.dateOfBirth?.message} />} />
    <View style={styles.units}><FilterChip label="kg" selected={weightUnit === 'kg'} onPress={() => onUnitChange?.(heightUnit, 'kg')} /><FilterChip label="lb" selected={weightUnit === 'lb'} onPress={() => onUnitChange?.(heightUnit, 'lb')} /></View>
    {input('weight', `Current weight in ${weightUnit}`, { keyboardType: 'decimal-pad' })}
    <View style={styles.units}><FilterChip label="Centimeters" selected={heightUnit === 'cm'} onPress={() => onUnitChange?.('cm', weightUnit)} /><FilterChip label="Feet and inches" selected={heightUnit === 'ft_in'} onPress={() => onUnitChange?.('ft_in', weightUnit)} /></View>
    {heightUnit === 'cm' ? input('height', 'Height in centimeters', { keyboardType: 'decimal-pad' }) : <View style={styles.row}>{input('feet', 'Height feet', { keyboardType: 'number-pad', containerStyle: styles.flex })}{input('inches', 'Height inches', { keyboardType: 'decimal-pad', containerStyle: styles.flex })}</View>}
    {showNotes ? input('notes', 'Profile notes', { multiline: true }) : null}
    <AppButton label={submitLabel} loading={isSubmitting} onPress={() => void save()} />
  </View>;
}
const styles = StyleSheet.create({ wrap: { gap: spacing.md }, row: { flexDirection: 'row', gap: spacing.sm }, flex: { flex: 1 }, units: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm } });
