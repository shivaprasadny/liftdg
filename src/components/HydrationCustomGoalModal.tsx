import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { FilterChip } from '@/components/FilterChip';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppColors } from '@/hooks/useAppColors';
import type { WaterUnit } from '@/types/settings';

type InputUnit = 'ml' | 'l' | 'floz';
const ML_PER_US_FL_OZ = 29.5735295625;
const toMl = (value: number, unit: InputUnit): number => (unit === 'ml' ? value : unit === 'l' ? value * 1000 : value * ML_PER_US_FL_OZ);
const fromMl = (ml: number, unit: InputUnit): number => (unit === 'ml' ? ml : unit === 'l' ? ml / 1000 : ml / ML_PER_US_FL_OZ);
const unitLabels: Record<InputUnit, string> = { ml: 'ml', l: 'Liters', floz: 'fl oz' };

interface AmountRule { min: number; max: number; rangeLabel: string; lowThreshold?: number; lowWarning?: string; highThreshold?: number; highWarning?: string; }

/** Shared shell for the goal/serving custom-amount modals: unit toggle, validation, and a confirm step for unusual values. */
function CustomAmountModal({ visible, title, waterUnit, initialValueMl, rule, onClose, onSave }: {
  visible: boolean; title: string; waterUnit: WaterUnit; initialValueMl: number; rule: AmountRule;
  onClose: () => void; onSave: (ml: number) => void;
}) {
  const colors = useAppColors();
  const [unit, setUnit] = useState<InputUnit>(waterUnit === 'us' ? 'floz' : 'l');
  const [text, setText] = useState(() => String(parseFloat(fromMl(initialValueMl, unit).toFixed(2))));
  const [error, setError] = useState<string>();

  const changeUnit = (next: InputUnit) => { const ml = toMl(Number(text) || 0, unit); setUnit(next); setText(String(parseFloat(fromMl(ml, next).toFixed(2)))); };

  const commit = () => {
    const parsed = Number(text.trim());
    if (!text.trim() || !Number.isFinite(parsed)) { setError('Enter a number.'); return; }
    if (parsed <= 0) { setError('Amount must be greater than zero.'); return; }
    const ml = Math.round(toMl(parsed, unit));
    if (ml < rule.min || ml > rule.max) { setError(`Enter a value between ${rule.rangeLabel}.`); return; }
    setError(undefined);
    const warning = ml <= (rule.lowThreshold ?? -1) ? rule.lowWarning : ml >= (rule.highThreshold ?? Infinity) ? rule.highWarning : null;
    if (warning) {
      Alert.alert('Please confirm', warning, [{ text: 'Cancel', style: 'cancel' }, { text: 'Save Anyway', onPress: () => { onSave(ml); onClose(); } }]);
      return;
    }
    onSave(ml); onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable accessibilityLabel="Close" style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(event) => event.stopPropagation()}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <AppInput label="Amount" keyboardType="decimal-pad" value={text} onChangeText={(value) => { setText(value); setError(undefined); }} error={error} autoFocus />
          <View style={styles.unitRow}>
            {(['ml', 'l', 'floz'] as InputUnit[]).map((item) => <FilterChip key={item} label={unitLabels[item]} selected={unit === item} onPress={() => changeUnit(item)} />)}
          </View>
          <View style={styles.actions}>
            <AppButton label="Cancel" variant="secondary" onPress={onClose} style={styles.actionButton} />
            <AppButton label="Save" onPress={commit} style={styles.actionButton} />
          </View>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface GoalProps { visible: boolean; waterUnit: WaterUnit; initialValueMl: number; onClose: () => void; onSave: (goalMl: number) => void; }

/** Daily goal: 250 ml – 15,000 ml, with a confirmation step for unusually low (<1 L) or high (>6 L) values. */
export function HydrationCustomGoalModal({ visible, waterUnit, initialValueMl, onClose, onSave }: GoalProps) {
  return (
    <CustomAmountModal visible={visible} title="Custom Daily Goal" waterUnit={waterUnit} initialValueMl={initialValueMl} onClose={onClose} onSave={onSave}
      rule={{
        min: 250, max: 15000, rangeLabel: '250 ml and 15,000 ml',
        lowThreshold: 1000, lowWarning: 'This is a very low daily water goal. Save it anyway?',
        highThreshold: 6000, highWarning: 'This is an unusually high daily water goal. Save it anyway?',
      }} />
  );
}

interface ServingProps { visible: boolean; waterUnit: WaterUnit; initialValueMl: number; dailyGoalMl: number; onClose: () => void; onSave: (servingMl: number) => void; }

/** Serving size: 25 ml – 5,000 ml, and must not exceed the daily goal without confirmation. */
export function HydrationCustomServingModal({ visible, waterUnit, initialValueMl, dailyGoalMl, onClose, onSave }: ServingProps) {
  return (
    <CustomAmountModal visible={visible} title="Custom Serving Size" waterUnit={waterUnit} initialValueMl={initialValueMl} onClose={onClose} onSave={onSave}
      rule={{
        min: 25, max: 5000, rangeLabel: '25 ml and 5,000 ml',
        highThreshold: dailyGoalMl, highWarning: 'This serving size is at or above your entire daily goal. Save it anyway?',
      }} />
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  sheet: { width: '100%', maxWidth: 360, padding: spacing.lg, borderRadius: radius.lg, gap: spacing.md },
  title: { ...typography.heading },
  unitRow: { flexDirection: 'row', gap: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionButton: { flex: 1 },
});
