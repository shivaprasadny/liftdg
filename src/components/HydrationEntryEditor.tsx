import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppColors } from '@/hooks/useAppColors';
import { displayUnitToMilliliters, millilitersToDisplayUnit } from '@/services/hydrationService';
import type { WaterEntry } from '@/types/hydration';
import type { WaterUnit } from '@/types/settings';

export interface HydrationEntryEditorResult { amountMl: number; loggedAt: string; notes: string | null }

interface Props {
  visible: boolean; unit: WaterUnit; entry?: WaterEntry | null; defaultDate?: Date;
  onClose: () => void; onSave: (result: HydrationEntryEditorResult) => void;
}

/** Adding an entry for a historical date requires explicitly choosing that date and time. */
export function HydrationEntryEditor({ visible, unit, entry, defaultDate, onClose, onSave }: Props) {
  const colors = useAppColors();
  const base = entry ? new Date(entry.loggedAt) : (defaultDate ?? new Date());
  const [amountText, setAmountText] = useState('');
  const [dateText, setDateText] = useState('');
  const [timeText, setTimeText] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!visible) return;
    setAmountText(entry ? String(parseFloat(millilitersToDisplayUnit(entry.amountMl, unit).toFixed(2))) : '');
    setDateText(format(base, 'yyyy-MM-dd')); setTimeText(format(base, 'HH:mm')); setNotes(entry?.notes ?? ''); setError(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset fields only when the modal opens or the target entry changes
  }, [visible, entry?.id]);

  const commit = () => {
    const amount = Number(amountText);
    if (!amountText.trim() || !Number.isFinite(amount) || amount <= 0) { setError('Enter a valid amount.'); return; }
    const loggedAt = new Date(`${dateText}T${timeText || '00:00'}:00`);
    if (Number.isNaN(loggedAt.getTime())) { setError('Enter a valid date and time.'); return; }
    onSave({ amountMl: Math.round(displayUnitToMilliliters(amount, unit)), loggedAt: loggedAt.toISOString(), notes: notes.trim() || null });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable accessibilityLabel="Close" style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(event) => event.stopPropagation()}>
            <Text style={[styles.title, { color: colors.text }]}>{entry ? 'Edit Entry' : 'Add Entry'}</Text>
            <AppInput label={`Amount (${unit === 'us' ? 'fl oz' : 'L'})`} keyboardType="decimal-pad" value={amountText} onChangeText={setAmountText} error={error} />
            <View style={styles.row}>
              <AppInput containerStyle={styles.half} label="Date" placeholder="YYYY-MM-DD" value={dateText} onChangeText={setDateText} />
              <AppInput containerStyle={styles.half} label="Time" placeholder="HH:MM" value={timeText} onChangeText={setTimeText} />
            </View>
            <AppInput label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
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

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { padding: spacing.lg, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  title: { ...typography.heading },
  row: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionButton: { flex: 1 },
});
