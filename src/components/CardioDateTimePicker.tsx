import { Ionicons } from '@expo/vector-icons';
import { addMonths, format, parseISO, startOfMonth } from 'date-fns';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useSettings } from '@/contexts/SettingsContext';
import { useAppColors } from '@/hooks/useAppColors';
import { AppButton } from './AppButton';
import { TrainingMonthPlanner } from './TrainingMonthPlanner';

export function CardioDateTimePicker({ dateDisplay, timeDisplay, onChange, error }: {
  dateDisplay: string; timeDisplay: string; onChange: (date: string, time: string) => void; error?: string;
}) {
  const colors = useAppColors(); const { settings } = useSettings();
  const [visible, setVisible] = useState(false); const [mode, setMode] = useState<'date' | 'time'>('date');
  const [date, setDate] = useState(toIso(dateDisplay)); const [month, setMonth] = useState(startOfMonth(parseISO(toIso(dateDisplay))));
  const initialTime = parseTime(timeDisplay); const [hour, setHour] = useState(initialTime.hour); const [minute, setMinute] = useState(initialTime.minute); const [period, setPeriod] = useState<'AM' | 'PM'>(initialTime.period);
  useEffect(() => { if (!visible) return; const nextDate = toIso(dateDisplay); const nextTime = parseTime(timeDisplay); setDate(nextDate); setMonth(startOfMonth(parseISO(nextDate))); setHour(nextTime.hour); setMinute(nextTime.minute); setPeriod(nextTime.period); }, [dateDisplay, timeDisplay, visible]);
  const shownTime = parseTime(timeDisplay);
  const done = () => { onChange(format(parseISO(date), 'MM/dd/yyyy'), to24Hour(hour, minute, period)); setVisible(false); };
  return <>
    <Text style={[styles.label, { color: colors.text }]}>Date and time</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Choose cardio date and time" onPress={() => setVisible(true)} style={[styles.summary, { backgroundColor: colors.surface, borderColor: error ? colors.danger : colors.border }]}>
      <View style={[styles.icon, { backgroundColor: colors.surfaceElevated }]}><Ionicons name="calendar-outline" size={22} color={colors.accent} /></View>
      <View style={styles.flex}><Text style={[styles.date, { color: colors.text }]}>{format(parseISO(toIso(dateDisplay)), 'EEE, MMM d, yyyy')}</Text><Text style={[styles.time, { color: colors.textMuted }]}>{shownTime.hour}:{String(shownTime.minute).padStart(2, '0')} {shownTime.period}</Text></View>
      <Text style={[styles.change, { color: colors.accent }]}>Change</Text>
    </Pressable>
    {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}><View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <View style={styles.head}><View style={styles.flex}><Text style={[styles.eyebrow, { color: colors.accent }]}>CARDIO SESSION</Text><Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Choose date & time</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => setVisible(false)} style={styles.close}><Ionicons name="close" size={25} color={colors.text} /></Pressable></View>
        <View style={[styles.tabs, { backgroundColor: colors.surface }]}>{(['date', 'time'] as const).map((value) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: mode === value }} onPress={() => setMode(value)} style={[styles.tab, mode === value && { backgroundColor: colors.accent }]}><Text style={[styles.tabText, { color: mode === value ? colors.accentText : colors.text }]}>{value === 'date' ? '📅 Date' : '🕐 Time'}</Text></Pressable>)}</View>
        {mode === 'date' ? <View style={styles.body}><View style={styles.monthHead}><Pressable style={styles.arrow} onPress={() => setMonth((value) => addMonths(value, -1))}><Ionicons name="chevron-back" size={22} color={colors.text} /></Pressable><Text style={[styles.month, { color: colors.text }]}>{format(month, 'MMMM yyyy')}</Text><Pressable style={styles.arrow} onPress={() => setMonth((value) => addMonths(value, 1))}><Ionicons name="chevron-forward" size={22} color={colors.text} /></Pressable></View><TrainingMonthPlanner month={month} selectedDate={date} items={[]} firstDayOfWeek={settings.firstDayOfWeek} onSelectDate={(value) => { setDate(value); setMode('time'); }} /></View>
          : <ScrollView contentContainerStyle={styles.timeBody}><Text style={[styles.preview, { color: colors.text }]}>{hour}:{String(minute).padStart(2, '0')} {period}</Text><PickerLabel text="HOUR" /> <View style={styles.grid}>{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <Choice key={value} label={String(value)} selected={hour === value} onPress={() => setHour(value)} />)}</View><PickerLabel text="MINUTE" /><View style={styles.grid}>{Array.from({ length: 12 }, (_, index) => index * 5).map((value) => <Choice key={value} label={String(value).padStart(2, '0')} selected={minute === value} onPress={() => setMinute(value)} />)}</View><PickerLabel text="AM OR PM" /><View style={styles.period}>{(['AM', 'PM'] as const).map((value) => <Choice key={value} label={value} selected={period === value} onPress={() => setPeriod(value)} wide />)}</View></ScrollView>}
        <View style={[styles.footer, { borderTopColor: colors.border }]}><AppButton label="Done" onPress={done} /></View>
      </View></View>
    </Modal>
  </>;
}

function PickerLabel({ text }: { text: string }) { const colors = useAppColors(); return <Text style={[styles.pickerLabel, { color: colors.textMuted }]}>{text}</Text>; }
function Choice({ label, selected, onPress, wide }: { label: string; selected: boolean; onPress: () => void; wide?: boolean }) { const colors = useAppColors(); return <Pressable onPress={onPress} style={[styles.choice, wide && styles.wide, { backgroundColor: selected ? colors.accent : colors.surface, borderColor: selected ? colors.accent : colors.border }]}><Text style={[styles.choiceText, { color: selected ? colors.accentText : colors.text }]}>{label}</Text></Pressable>; }
function toIso(value: string): string { const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value); if (!match) return format(new Date(), 'yyyy-MM-dd'); const iso = `${match[3]}-${match[1]}-${match[2]}`; return Number.isNaN(parseISO(iso).getTime()) ? format(new Date(), 'yyyy-MM-dd') : iso; }
function parseTime(value: string) { const match = /^(\d{2}):(\d{2})$/.exec(value); const rawHour = match ? Number(match[1]) : new Date().getHours(); const rawMinute = match ? Number(match[2]) : new Date().getMinutes(); return { hour: rawHour % 12 || 12, minute: Math.min(55, Math.round(rawMinute / 5) * 5), period: (rawHour >= 12 ? 'PM' : 'AM') as 'AM' | 'PM' }; }
function to24Hour(hour: number, minute: number, period: 'AM' | 'PM') { const value = period === 'AM' ? hour % 12 : hour % 12 + 12; return `${String(value).padStart(2, '0')}:${String(minute).padStart(2, '0')}`; }

const styles = StyleSheet.create({ label: { ...typography.label }, summary: { minHeight: 76, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md }, icon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, flex: { flex: 1 }, date: { ...typography.body, fontWeight: '800' }, time: { ...typography.caption }, change: { ...typography.label }, error: { ...typography.caption }, overlay: { flex: 1, justifyContent: 'flex-end' }, sheet: { maxHeight: '92%', borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, overflow: 'hidden' }, head: { padding: spacing.lg, flexDirection: 'row', alignItems: 'center' }, eyebrow: { ...typography.caption, fontWeight: '900', letterSpacing: 1 }, title: { ...typography.title, fontSize: 25 }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, tabs: { marginHorizontal: spacing.lg, padding: 4, borderRadius: radius.md, flexDirection: 'row' }, tab: { flex: 1, minHeight: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' }, tabText: { ...typography.label }, body: { paddingTop: spacing.md }, monthHead: { marginHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center' }, arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, month: { ...typography.heading, flex: 1, textAlign: 'center' }, timeBody: { padding: spacing.lg, gap: spacing.md }, preview: { ...typography.title, fontSize: 32, textAlign: 'center' }, pickerLabel: { ...typography.caption, fontWeight: '900', letterSpacing: 1 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, choice: { width: '22%', minHeight: 45, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, wide: { flex: 1, width: undefined }, choiceText: { ...typography.label }, period: { flexDirection: 'row', gap: spacing.sm }, footer: { padding: spacing.lg, borderTopWidth: 1 } });
