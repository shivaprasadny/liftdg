import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppColors } from '@/hooks/useAppColors';
import { displayUnitToMilliliters, formatServingAmount } from '@/services/hydrationService';
import type { WaterUnit } from '@/types/settings';

const PRESETS_ML = [100, 200, 250, 300, 500, 750, 1000];

interface Props { visible: boolean; unit: WaterUnit; onClose: () => void; onSelect: (amountMl: number) => void; }

/** Long-press on the plus button opens this preset/custom-amount picker. */
export function HydrationQuickAddSheet({ visible, unit, onClose, onSelect }: Props) {
  const colors = useAppColors();
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const close = () => { setCustomOpen(false); setCustomValue(''); onClose(); };
  const submitCustom = () => {
    const parsed = Number(customValue);
    if (Number.isFinite(parsed) && parsed > 0) { onSelect(displayUnitToMilliliters(parsed, unit)); close(); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable accessibilityLabel="Close" style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={close}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.title, { color: colors.text }]}>Add Water</Text>
            {!customOpen ? (
              <>
                <View style={styles.grid}>
                  {PRESETS_ML.map((amount) => (
                    <Pressable key={amount} accessibilityRole="button" accessibilityLabel={`Add ${formatServingAmount(amount, unit)}`}
                      onPress={() => { onSelect(amount); close(); }}
                      style={({ pressed }) => [styles.chip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }, pressed && styles.pressed]}>
                      <Text style={[styles.chipText, { color: colors.text }]}>{formatServingAmount(amount, unit)}</Text>
                    </Pressable>
                  ))}
                </View>
                <AppButton label="Custom Amount" variant="secondary" onPress={() => setCustomOpen(true)} />
              </>
            ) : (
              <>
                <AppInput label={`Amount (${unit === 'us' ? 'fl oz' : 'ml'})`} keyboardType="numeric" value={customValue} onChangeText={setCustomValue} autoFocus />
                <AppButton label="Add" onPress={submitCustom} disabled={!customValue} />
              </>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { padding: spacing.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { ...typography.heading },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, minHeight: 44, justifyContent: 'center' },
  chipText: { ...typography.label },
  pressed: { opacity: 0.75 },
});
