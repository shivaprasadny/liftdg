import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { cardioDateTimeDisplayToIso, isoToCardioDateTimeDisplay, milesToKilometers } from '@/services/cardioService';
import type { CardioActivityType, CardioSessionInput } from '@/types/cardio';
import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { CardioActivityPicker } from './CardioActivityPicker';
import { CardioDateTimePicker } from './CardioDateTimePicker';
import { CardioTimer } from './CardioTimer';
import { FilterChip } from './FilterChip';

const nonnegative = (label: string) => z.string().refine((value) => value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0), `${label} cannot be negative`);
const schema = z.object({ activityType: z.string(), dateDisplay: z.string().refine((value) => { try { cardioDateTimeDisplayToIso(value, '00:00'); return true; } catch { return false; } }, 'Choose a valid date.'), timeDisplay: z.string().refine((value) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(value), 'Choose a valid time.'), durationHours: z.string().refine((value) => value === '' || (Number.isInteger(Number(value)) && Number(value) >= 0), 'Hours must be a whole number.'), durationMinutes: z.string().refine((value) => value === '' || (Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 59), 'Minutes must be between 0 and 59.'), distance: nonnegative('Distance'), distanceUnit: z.enum(['km', 'mi']), averageHeartRate: nonnegative('Heart rate'), maxHeartRate: nonnegative('Heart rate'), calories: nonnegative('Calories'), elevationGain: nonnegative('Elevation'), cadence: nonnegative('Cadence'), notes: z.string() }).refine((value) => Number(value.durationHours || 0) > 0 || Number(value.durationMinutes || 0) > 0, { message: 'Enter a duration greater than zero.', path: ['durationMinutes'] });
type Form = z.infer<typeof schema>;
const optional = (value: string) => value === '' ? null : Number(value);
const now = isoToCardioDateTimeDisplay(new Date().toISOString());

export function CardioSessionForm({ onSubmit, loading = false, initialActivity = 'running' }: {
  onSubmit: (input: CardioSessionInput) => Promise<void>; loading?: boolean; initialActivity?: CardioActivityType;
}) {
  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema), defaultValues: { activityType: initialActivity, dateDisplay: now.date, timeDisplay: now.time, durationHours: '', durationMinutes: '', distance: '', distanceUnit: 'km', averageHeartRate: '', maxHeartRate: '', calories: '', elevationGain: '', cadence: '', notes: '' } });
  const unit = watch('distanceUnit');
  const submit = handleSubmit(async (value) => {
    const distance = optional(value.distance);
    await onSubmit({ workoutId: null, workoutExerciseId: null, activityType: value.activityType as CardioActivityType,
      date: cardioDateTimeDisplayToIso(value.dateDisplay, value.timeDisplay), durationSeconds: Number(value.durationHours || 0) * 3600 + Number(value.durationMinutes || 0) * 60,
      distanceKm: distance === null ? null : unit === 'mi' ? milesToKilometers(distance) : distance,
      averageHeartRate: optional(value.averageHeartRate), maxHeartRate: optional(value.maxHeartRate), calories: optional(value.calories),
      elevationGain: optional(value.elevationGain), cadence: optional(value.cadence), rounds: null, notes: value.notes.trim() || null });
  });

  return <View style={styles.form}>
    <Text style={styles.label}>Activity</Text>
    <Controller control={control} name="activityType" render={({ field }) => <CardioActivityPicker value={field.value as CardioActivityType} onChange={field.onChange} />} />
    <CardioTimer onElapsed={(seconds) => { setValue('durationHours', String(Math.floor(seconds / 3600))); setValue('durationMinutes', String(Math.floor((seconds % 3600) / 60))); }} />
    <CardioDateTimePicker dateDisplay={watch('dateDisplay')} timeDisplay={watch('timeDisplay')}
      error={errors.dateDisplay?.message ?? errors.timeDisplay?.message}
      onChange={(date, time) => { setValue('dateDisplay', date, { shouldValidate: true }); setValue('timeDisplay', time, { shouldValidate: true }); }} />
    <Text style={styles.label}>Duration</Text>
    <View style={styles.row}>
      <Controller control={control} name="durationHours" render={({ field }) => <AppInput containerStyle={styles.flex} label="Hours" placeholder="e.g. 1" keyboardType="number-pad" value={field.value} onChangeText={field.onChange} error={errors.durationHours?.message} />} />
      <Controller control={control} name="durationMinutes" render={({ field }) => <AppInput containerStyle={styles.flex} label="Minutes" placeholder="e.g. 30" keyboardType="number-pad" value={field.value} onChangeText={field.onChange} error={errors.durationMinutes?.message} />} />
    </View>
    <View style={styles.row}>
      <Controller control={control} name="distance" render={({ field }) => <AppInput containerStyle={styles.flex} label="Distance" placeholder="e.g. 5.0" keyboardType="decimal-pad" value={field.value} onChangeText={field.onChange} error={errors.distance?.message} />} />
      <View style={styles.unit}><FilterChip label="km" selected={unit === 'km'} onPress={() => setValue('distanceUnit', 'km')} /><FilterChip label="mi" selected={unit === 'mi'} onPress={() => setValue('distanceUnit', 'mi')} /></View>
    </View>
    <View style={styles.row}><Controller control={control} name="averageHeartRate" render={({ field }) => <AppInput containerStyle={styles.flex} label="Average HR" keyboardType="number-pad" value={field.value} onChangeText={field.onChange} />} /><Controller control={control} name="maxHeartRate" render={({ field }) => <AppInput containerStyle={styles.flex} label="Maximum HR" keyboardType="number-pad" value={field.value} onChangeText={field.onChange} />} /></View>
    <View style={styles.row}><Controller control={control} name="calories" render={({ field }) => <AppInput containerStyle={styles.flex} label="Calories" keyboardType="number-pad" value={field.value} onChangeText={field.onChange} />} /><Controller control={control} name="elevationGain" render={({ field }) => <AppInput containerStyle={styles.flex} label="Elevation gain" keyboardType="decimal-pad" value={field.value} onChangeText={field.onChange} />} /></View>
    <Controller control={control} name="cadence" render={({ field }) => <AppInput label="Cadence" keyboardType="number-pad" value={field.value} onChangeText={field.onChange} />} />
    <Controller control={control} name="notes" render={({ field }) => <AppInput label="Notes" multiline value={field.value} onChangeText={field.onChange} />} />
    <AppButton label="Save Cardio Workout" loading={loading} onPress={() => void submit()} />
  </View>;
}

const styles = StyleSheet.create({ form: { gap: spacing.md }, label: { ...typography.label, color: colors.text }, row: { flexDirection: 'row', gap: spacing.sm }, flex: { flex: 1 }, unit: { justifyContent: 'flex-end', flexDirection: 'row', gap: spacing.xs } });
