import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppColors } from '@/hooks/useAppColors';
import type { HydrationPeriodKind } from '@/types/hydration';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const quarterLabels = ['Jan–Mar', 'Apr–Jun', 'Jul–Sep', 'Oct–Dec'];

interface Props {
  visible: boolean;
  kind: HydrationPeriodKind;
  referenceDate: Date;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  onSelectCustomRange: (from: string, to: string) => void;
}

/** Adapts its content to the active period kind; no native date-picker dependency is added. */
export function HydrationDatePickerSheet({ visible, kind, referenceDate, onClose, onSelectDate, onSelectCustomRange }: Props) {
  const colors = useAppColors();
  const [year, setYear] = useState(referenceDate.getFullYear());
  const [dayText, setDayText] = useState(() => referenceDate.toISOString().slice(0, 10));
  const [fromText, setFromText] = useState(() => referenceDate.toISOString().slice(0, 10));
  const [toText, setToText] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string>();

  const submitDay = () => {
    const parsed = new Date(`${dayText}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) { setError('Enter a valid date (YYYY-MM-DD).'); return; }
    setError(undefined); onSelectDate(parsed); onClose();
  };
  const submitCustom = () => {
    if (Number.isNaN(new Date(fromText).getTime()) || Number.isNaN(new Date(toText).getTime()) || fromText > toText) { setError('Enter a valid start and end date.'); return; }
    setError(undefined); onSelectCustomRange(fromText, toText); onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Pressable accessibilityLabel="Close" style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(event) => event.stopPropagation()}>
          {(kind === 'day' || kind === 'week') && (
            <>
              <Text style={[styles.title, { color: colors.text }]}>{kind === 'day' ? 'Choose a Date' : 'Choose a Week'}</Text>
              <AppInput label="Date" placeholder="YYYY-MM-DD" value={dayText} onChangeText={setDayText} error={error} />
              <AppButton label="Go" onPress={submitDay} />
            </>
          )}
          {kind === 'month' && (
            <>
              <YearStepper year={year} onChange={setYear} colors={colors} />
              <View style={styles.grid}>
                {monthNames.map((label, index) => (
                  <Pressable key={label} accessibilityRole="button" onPress={() => { onSelectDate(new Date(year, index, 1)); onClose(); }}
                    style={[styles.monthCell, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.text }}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
          {kind === 'quarter' && (
            <>
              <YearStepper year={year} onChange={setYear} colors={colors} />
              <View style={styles.grid}>
                {quarterLabels.map((label, index) => (
                  <Pressable key={label} accessibilityRole="button" onPress={() => { onSelectDate(new Date(year, index * 3 + 2, 1)); onClose(); }}
                    style={[styles.quarterCell, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.text }}>{label}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}
          {kind === 'year' && <YearStepper year={year} onChange={setYear} onConfirm={() => { onSelectDate(new Date(year, 0, 1)); onClose(); }} colors={colors} />}
          {kind === 'custom' && (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Custom Range</Text>
              <AppInput label="From" placeholder="YYYY-MM-DD" value={fromText} onChangeText={setFromText} />
              <AppInput label="To" placeholder="YYYY-MM-DD" value={toText} onChangeText={setToText} error={error} />
              <AppButton label="Apply" onPress={submitCustom} />
            </>
          )}
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function YearStepper({ year, onChange, onConfirm, colors }: { year: number; onChange: (year: number) => void; onConfirm?: () => void; colors: ReturnType<typeof useAppColors> }) {
  return (
    <View style={styles.yearRow}>
      <Pressable accessibilityRole="button" accessibilityLabel="Previous year" onPress={() => onChange(year - 1)} hitSlop={8}><Text style={[styles.yearArrow, { color: colors.text }]}>‹</Text></Pressable>
      <Text style={[styles.yearText, { color: colors.text }]}>{year}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Next year" onPress={() => onChange(year + 1)} hitSlop={8}><Text style={[styles.yearArrow, { color: colors.text }]}>›</Text></Pressable>
      {onConfirm && <AppButton label="Go" onPress={onConfirm} style={styles.yearGoButton} />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  sheet: { width: '100%', maxWidth: 380, padding: spacing.lg, borderRadius: radius.lg, gap: spacing.md },
  title: { ...typography.heading },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  monthCell: { width: '30%', paddingVertical: spacing.sm, alignItems: 'center', borderWidth: 1, borderRadius: radius.md },
  quarterCell: { width: '47%', paddingVertical: spacing.md, alignItems: 'center', borderWidth: 1, borderRadius: radius.md },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  yearArrow: { fontSize: 28, paddingHorizontal: spacing.sm },
  yearText: { ...typography.heading },
  yearGoButton: { marginLeft: spacing.md },
});
