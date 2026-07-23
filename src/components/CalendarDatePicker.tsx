import { Ionicons } from '@expo/vector-icons';
import { addMonths, format, parseISO, startOfMonth } from 'date-fns';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useSettings } from '@/contexts/SettingsContext';
import { useAppColors } from '@/hooks/useAppColors';
import { AppButton } from './AppButton';
import { TrainingMonthPlanner } from './TrainingMonthPlanner';

export function CalendarDatePicker({ label, value, onChange, maximumDate, error }: {
  label: string; value: string; onChange: (value: string) => void; maximumDate?: string; error?: string;
}) {
  const colors = useAppColors(); const { settings } = useSettings();
  const safeValue = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : format(new Date(), 'yyyy-MM-dd');
  const [visible, setVisible] = useState(false); const [selected, setSelected] = useState(safeValue); const [month, setMonth] = useState(startOfMonth(parseISO(safeValue))); const [pickerError, setPickerError] = useState<string>();
  useEffect(() => { if (visible) { setSelected(safeValue); setMonth(startOfMonth(parseISO(safeValue))); setPickerError(undefined); } }, [safeValue, visible]);
  const choose = (date: string) => { if (maximumDate && date > maximumDate) { setPickerError('Measurements cannot be recorded in the future.'); return; } setPickerError(undefined); setSelected(date); };
  return <>
    <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${format(parseISO(safeValue), 'MMMM d, yyyy')}. Change date`} onPress={() => setVisible(true)} style={[styles.summary, { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border }]}>
      <View style={[styles.icon, { backgroundColor: colors.surfaceElevated }]}><Ionicons name="calendar-outline" size={22} color={colors.accent} /></View><View style={styles.flex}><Text style={[styles.date, { color: colors.text }]}>{format(parseISO(safeValue), 'EEEE, MMMM d, yyyy')}</Text><Text style={[styles.hint, { color: colors.textMuted }]}>Tap to choose another date</Text></View><Ionicons name="chevron-forward" size={20} color={colors.accent} />
    </Pressable>
    {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}><View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.head}><View style={styles.flex}><Text style={[styles.eyebrow, { color: colors.accent }]}>BODY PROGRESS</Text><Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Choose measurement date</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close date picker" onPress={() => setVisible(false)} style={styles.close}><Ionicons name="close" size={25} color={colors.text} /></Pressable></View>
        <View style={styles.monthHead}><Pressable accessibilityRole="button" accessibilityLabel="Previous month" style={styles.arrow} onPress={() => setMonth((current) => addMonths(current, -1))}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable><Text style={[styles.month, { color: colors.text }]}>{format(month, 'MMMM yyyy')}</Text><Pressable accessibilityRole="button" accessibilityLabel="Next month" style={styles.arrow} onPress={() => setMonth((current) => addMonths(current, 1))}><Ionicons name="chevron-forward" size={22} color={colors.text} /></Pressable></View>
        <TrainingMonthPlanner month={month} selectedDate={selected} items={[]} firstDayOfWeek={settings.firstDayOfWeek} onSelectDate={choose} />
        {pickerError ? <Text accessibilityRole="alert" style={[styles.pickerError, { color: colors.danger }]}>{pickerError}</Text> : null}
        <View style={[styles.footer, { borderTopColor: colors.border }]}><AppButton label="Use This Date" onPress={() => { onChange(selected); setVisible(false); }} /></View>
      </View></View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({ label: { ...typography.label }, summary: { minHeight: 76, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md }, icon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, flex: { flex: 1 }, date: { ...typography.body, fontWeight: '800' }, hint: { ...typography.caption }, error: { ...typography.caption }, overlay: { flex: 1, justifyContent: 'flex-end' }, sheet: { borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, overflow: 'hidden', paddingTop: spacing.sm }, head: { padding: spacing.lg, flexDirection: 'row', alignItems: 'center' }, eyebrow: { ...typography.caption, fontWeight: '900', letterSpacing: 1 }, title: { ...typography.title, fontSize: 24 }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, monthHead: { marginHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center' }, arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, month: { ...typography.heading, flex: 1, textAlign: 'center' }, pickerError: { ...typography.caption, marginHorizontal: spacing.lg, marginTop: spacing.sm, textAlign: 'center' }, footer: { padding: spacing.lg, borderTopWidth: 1, marginTop: spacing.md } });
