import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { centimetersToInches, inchesToCentimeters } from '@/services/bodyMeasurementService';
import type { BodyMeasurementEntryInput, BodyMeasurementUnit, MeasurementType } from '@/types/body';
import type { WeightUnit } from '@/types/settings';
import { displayToKilograms, kilogramsToDisplay } from '@/utils/units';
import { AppButton } from './AppButton';
import { AppInput } from './AppInput';
import { CalendarDatePicker } from './CalendarDatePicker';
import { MeasurementGuideSheet } from './MeasurementGuideSheet';

export function BodyMeasurementForm({ types, initial, measurementUnit, weightUnit, onSubmit }: {
  types: MeasurementType[]; initial?: BodyMeasurementEntryInput; measurementUnit: BodyMeasurementUnit;
  weightUnit: WeightUnit; onSubmit: (input: BodyMeasurementEntryInput) => Promise<void>;
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState(initial?.measuredAt.slice(0, 10) ?? today);
  const [weight, setWeight] = useState(initial?.bodyWeightKg != null ? String(kilogramsToDisplay(initial.bodyWeightKg, weightUnit)) : '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  // The edit/duplicate source loads after the screen, so every top-level field must be synchronized—not only measurement values.
  useEffect(() => {
    if (!initial) return;
    setDate(initial.measuredAt.slice(0, 10));
    setWeight(initial.bodyWeightKg != null ? String(kilogramsToDisplay(initial.bodyWeightKg, weightUnit)) : '');
    setNotes(initial.notes ?? '');
    setValues(Object.fromEntries(initial.values.map((value) => [value.measurementTypeId, String(measurementUnit === 'in' ? centimetersToInches(value.valueCm) : value.valueCm)])));
  }, [initial, measurementUnit, weightUnit]);

  const save = async () => {
    try {
      setBusy(true); setError(undefined);
      const parsed = types.flatMap((type) => {
        const raw = values[type.id]?.trim(); if (!raw) return [];
        const number = Number(raw.replace(',', '.'));
        return [{ measurementTypeId: type.id, valueCm: measurementUnit === 'in' ? inchesToCentimeters(number) : number }];
      });
      const weightNumber = Number(weight.replace(',', '.'));
      await onSubmit({ measuredAt: new Date(`${date}T12:00:00`).toISOString(), bodyWeightKg: weight.trim() ? displayToKilograms(weightNumber, weightUnit) : null, notes: notes.trim() || null, values: parsed });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save measurements.');
    } finally {
      setBusy(false);
    }
  };

  return <View style={styles.wrap}>
    <CalendarDatePicker label="Measurement date" value={date} maximumDate={today} onChange={setDate} />
    <AppInput accessibilityLabel={`Body weight in ${weightUnit}`} label={`Body weight (${weightUnit}) — optional`} placeholder={weightUnit === 'kg' ? 'e.g. 75.5' : 'e.g. 166'} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} />
    {types.map((type) => <AppInput key={type.id} accessibilityLabel={`${type.displayName} measurement in ${measurementUnit}`} label={`${type.displayName} (${measurementUnit})`} placeholder={measurementUnit === 'cm' ? 'e.g. 84.0' : 'e.g. 33.0'} keyboardType="decimal-pad" value={values[type.id] ?? ''} onChangeText={(text) => setValues((current) => ({ ...current, [type.id]: text }))} />)}
    <AppInput accessibilityLabel="Measurement notes" label="Notes" placeholder="e.g. Morning measurement before breakfast" multiline value={notes} onChangeText={setNotes} />
    <MeasurementGuideSheet />
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <AppButton label="Save measurement" loading={busy} onPress={() => void save()} />
  </View>;
}

const styles = StyleSheet.create({ wrap: { gap: spacing.md }, error: { ...typography.caption, color: colors.danger } });
