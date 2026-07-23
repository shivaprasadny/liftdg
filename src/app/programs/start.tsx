import { Ionicons } from '@expo/vector-icons';
import { addMonths, format, parseISO, startOfMonth } from 'date-fns';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { PlannerMonthYearPicker } from '@/components/PlannerMonthYearPicker';
import { TrainingMonthPlanner } from '@/components/TrainingMonthPlanner';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useSettings } from '@/contexts/SettingsContext';
import { useAppColors } from '@/hooks/useAppColors';
import { useDatabase } from '@/hooks/useDatabase';
import { getProgramById } from '@/repositories/programRepository';
import { startProgram } from '@/repositories/scheduledWorkoutRepository';
import { formatProgramLength } from '@/services/programService';
import { calculateProgramEndDate } from '@/services/scheduledWorkoutService';
import type { ProgramTemplateWithWeeks } from '@/types/program';
import { getUserMessage } from '@/utils/errors';

export default function StartProgramScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDatabase();
  const colors = useAppColors();
  const { settings } = useSettings();
  const today = new Date();
  const [program, setProgram] = useState<ProgramTemplateWithWeeks | null>();
  const [selectedDate, setSelectedDate] = useState(format(today, 'yyyy-MM-dd'));
  const [month, setMonth] = useState(startOfMonth(today));
  const [pickerVisible, setPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => {
    if (id) void getProgramById(db, id).then(setProgram);
  }, [db, id]));

  const workoutCount = useMemo(() => program?.weeks.reduce(
    (count, week) => count + week.days.filter((day) => !day.isRestDay && day.planId).length,
    0,
  ) ?? 0, [program]);

  const chooseDate = (date: string) => {
    setSelectedDate(date);
    const parsed = parseISO(date);
    if (parsed.getMonth() !== month.getMonth() || parsed.getFullYear() !== month.getFullYear()) {
      setMonth(startOfMonth(parsed));
    }
  };

  const chooseMonth = (date: Date) => {
    const firstDay = startOfMonth(date);
    setMonth(firstDay);
    setSelectedDate(format(firstDay, 'yyyy-MM-dd'));
  };

  const confirm = async () => {
    if (!program) return;
    try {
      setSaving(true);
      const count = await startProgram(db, program.id, selectedDate);
      Alert.alert(
        'Program scheduled',
        `${count} workouts were added beginning ${format(parseISO(selectedDate), 'MMMM d, yyyy')}.`,
        [{ text: 'View Calendar', onPress: () => router.replace('/calendar') }],
      );
    } catch (error) {
      Alert.alert('Could not schedule program', getUserMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (program === undefined) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }
  if (!program) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><Text style={{ color: colors.textMuted }}>Program not found.</Text></View>;
  }

  const endDate = calculateProgramEndDate(selectedDate, program.durationWeeks);
  return <View style={[styles.screen, { backgroundColor: colors.background }]}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={[styles.eyebrow, { color: colors.accent }]}>SCHEDULE PROGRAM</Text>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{program.name}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{formatProgramLength(program)} · {workoutCount} workouts will be planned</Text>
      </View>

      <View style={[styles.stepCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.stepHead}>
          <View style={[styles.stepNumber, { backgroundColor: colors.accent }]}><Text style={[styles.stepNumberText, { color: colors.accentText }]}>1</Text></View>
          <View style={styles.flex}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>Choose your first day</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Every program workout is scheduled forward from this date.</Text>
          </View>
        </View>
        <View style={[styles.toolbar, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous month" style={styles.iconButton} onPress={() => chooseMonth(addMonths(month, -1))}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Choose month and year, currently ${format(month, 'MMMM yyyy')}`} onPress={() => setPickerVisible(true)} style={styles.monthButton}>
            <Text style={[styles.month, { color: colors.text }]}>{format(month, 'MMMM')}</Text>
            <Text style={[styles.year, { color: colors.textMuted }]}>{format(month, 'yyyy')}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Next month" style={styles.iconButton} onPress={() => chooseMonth(addMonths(month, 1))}>
            <Ionicons name="chevron-forward" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <TrainingMonthPlanner month={month} selectedDate={selectedDate} items={[]} firstDayOfWeek={settings.firstDayOfWeek} onSelectDate={chooseDate} />

      <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <DateSummary icon="play" label="STARTS" value={format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')} iconColor={colors.accent} iconBackground={colors.surfaceElevated} textColor={colors.text} mutedColor={colors.textMuted} />
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <DateSummary icon="flag" label="PLANNED FINISH" value={format(parseISO(endDate), 'EEEE, MMMM d, yyyy')} iconColor={colors.warning} iconBackground={colors.surfaceElevated} textColor={colors.text} mutedColor={colors.textMuted} />
      </View>

      <View style={[styles.notice, { backgroundColor: colors.surfaceElevated }]}>
        <Ionicons name="information-circle-outline" size={22} color={colors.accent} />
        <Text style={[styles.noticeText, { color: colors.textMuted }]}>This creates {workoutCount} linked calendar workouts. Rest days stay open. You can later cancel this program schedule without deleting completed workouts.</Text>
      </View>
      <AppButton label={saving ? 'Scheduling…' : `Schedule ${workoutCount} Workouts`} loading={saving} onPress={() => void confirm()} />
      <AppButton label="Cancel" variant="secondary" onPress={() => router.back()} />
    </ScrollView>
    <PlannerMonthYearPicker visible={pickerVisible} value={month} onClose={() => setPickerVisible(false)} onSelect={chooseMonth} />
  </View>;
}

function DateSummary({ icon, label, value, iconColor, iconBackground, textColor, mutedColor }: {
  icon: 'play' | 'flag'; label: string; value: string; iconColor: string; iconBackground: string; textColor: string; mutedColor: string;
}) {
  return <View style={styles.summaryRow}>
    <View style={[styles.summaryIcon, { backgroundColor: iconBackground }]}><Ionicons name={icon} size={18} color={iconColor} /></View>
    <View style={styles.flex}><Text style={[styles.summaryLabel, { color: mutedColor }]}>{label}</Text><Text style={[styles.summaryValue, { color: textColor }]}>{value}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingVertical: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  hero: { paddingHorizontal: spacing.lg, gap: spacing.xs }, eyebrow: { ...typography.caption, fontWeight: '900', letterSpacing: 1.3 },
  title: { ...typography.title, fontSize: 27 }, subtitle: { ...typography.caption, lineHeight: 18 },
  stepCard: { marginHorizontal: spacing.lg, borderWidth: 1, borderRadius: 20, padding: spacing.lg, gap: spacing.md },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, stepNumber: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { ...typography.heading }, stepTitle: { ...typography.heading }, flex: { flex: 1 },
  toolbar: { minHeight: 54, borderWidth: 1, borderRadius: 14, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  iconButton: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  monthButton: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  month: { ...typography.heading }, year: { ...typography.body, fontWeight: '700' },
  summary: { marginHorizontal: spacing.lg, borderWidth: 1, borderRadius: 20, padding: spacing.lg, gap: spacing.md },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, summaryIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  summaryLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 }, summaryValue: { ...typography.body, fontWeight: '700' }, line: { height: 1 },
  notice: { marginHorizontal: spacing.lg, padding: spacing.lg, borderRadius: 16, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noticeText: { ...typography.caption, flex: 1, lineHeight: 18 },
});
