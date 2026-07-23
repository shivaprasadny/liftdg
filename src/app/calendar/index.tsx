import { Ionicons } from '@expo/vector-icons';
import { addMonths, format, parseISO, startOfMonth } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlannerMonthYearPicker } from '@/components/PlannerMonthYearPicker';
import { TrainingMonthPlanner } from '@/components/TrainingMonthPlanner';
import { TrainingNavigation } from '@/components/TrainingNavigation';
import { WorkoutTypeBadge } from '@/components/WorkoutTypeBadge';
import { daypartLabels } from '@/constants/scheduledWorkout';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useSettings } from '@/contexts/SettingsContext';
import { usePlanDraft } from '@/contexts/PlanDraftContext';
import { useAppColors } from '@/hooks/useAppColors';
import { useDatabase } from '@/hooks/useDatabase';
import { getScheduledWorkoutsInRange } from '@/repositories/scheduledWorkoutRepository';
import { compareScheduledWorkouts, plannerGridRange } from '@/services/scheduledWorkoutService';
import type { ScheduledWorkout } from '@/types/scheduledWorkout';

const activeStatuses = new Set(['scheduled', 'in_progress']);

export default function CalendarScreen({ embeddedInTab = false }: { embeddedInTab?: boolean } = {}) {
  const db = useDatabase();
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { reset: resetPlanDraft } = usePlanDraft();
  const today = new Date();
  const [month, setMonth] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState(format(today, 'yyyy-MM-dd'));
  const [items, setItems] = useState<ScheduledWorkout[]>();
  const [pickerVisible, setPickerVisible] = useState(false);
  const range = useMemo(() => plannerGridRange(month, settings.firstDayOfWeek), [month, settings.firstDayOfWeek]);

  const load = useCallback(() => {
    setItems(undefined);
    void getScheduledWorkoutsInRange(db, format(range.from, 'yyyy-MM-dd'), format(range.to, 'yyyy-MM-dd')).then(setItems);
  }, [db, range.from, range.to]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const selectedItems = useMemo(() => (items ?? [])
    .filter((item) => item.scheduledDate === selectedDate)
    .sort(compareScheduledWorkouts), [items, selectedDate]);

  const changeMonth = (date: Date) => {
    const next = startOfMonth(date);
    setMonth(next);
    setSelectedDate(format(next, 'yyyy-MM-dd'));
  };
  const goToday = () => {
    const now = new Date();
    setMonth(startOfMonth(now));
    setSelectedDate(format(now, 'yyyy-MM-dd'));
  };
  const openAddMenu = () => Alert.alert(
    'Add workout',
    `What would you like to add on ${format(parseISO(selectedDate), 'MMMM d')}?`,
    [
      { text: 'Schedule Existing Workout', onPress: () => router.push({ pathname: '/calendar/schedule', params: { date: selectedDate } }) },
      { text: 'Create New Workout', onPress: () => { resetPlanDraft(); router.push({ pathname: '/plans/create', params: { scheduleDate: selectedDate } }); } },
      { text: 'Cancel', style: 'cancel' },
    ],
  );

  return <View style={[styles.screen, { backgroundColor: colors.background }]}>
    <ScrollView contentContainerStyle={styles.content} stickyHeaderIndices={[0]}>
      <View style={[styles.top, { backgroundColor: colors.background, paddingTop: embeddedInTab ? insets.top + spacing.sm : spacing.md }]}>
        <TrainingNavigation selected="calendar" />
        <View style={styles.hero}>
          <View style={styles.flex}>
            <Text style={[styles.eyebrow, { color: colors.accent }]}>TRAINING PLANNER</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Your month, at a glance</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>Plan training, stay flexible, and start when you’re ready.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Add or create workout on ${format(parseISO(selectedDate), 'MMMM d')}`}
            style={[styles.addTop, { backgroundColor: colors.accent }]} onPress={openAddMenu}>
            <Ionicons name="add" size={28} color={colors.accentText} />
          </Pressable>
        </View>
        <View style={[styles.toolbar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous month" style={[styles.navButton, { borderColor: colors.border }]} onPress={() => changeMonth(addMonths(month, -1))}><Ionicons name="chevron-back" size={20} color={colors.text} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Choose month and year, currently ${format(month, 'MMMM yyyy')}`} onPress={() => setPickerVisible(true)} style={styles.monthSelector}>
            <Text style={[styles.monthText, { color: colors.text }]}>{format(month, 'MMMM')}</Text>
            <Text style={[styles.yearText, { color: colors.textMuted }]}>{format(month, 'yyyy')}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Go to today" onPress={goToday} style={[styles.today, { borderColor: colors.accent }]}><Text style={[styles.todayText, { color: colors.accent }]}>Today</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Next month" style={[styles.navButton, { borderColor: colors.border }]} onPress={() => changeMonth(addMonths(month, 1))}><Ionicons name="chevron-forward" size={20} color={colors.text} /></Pressable>
        </View>
      </View>

      {items === undefined ? <View style={styles.loading}><ActivityIndicator size="large" color={colors.accent} /><Text style={[styles.subtitle, { color: colors.textMuted }]}>Building your month…</Text></View> : <>
        <TrainingMonthPlanner month={month} selectedDate={selectedDate} items={items} firstDayOfWeek={settings.firstDayOfWeek} onSelectDate={setSelectedDate} />
        <View style={[styles.dayPanel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.dayHeader}>
            <View style={styles.flex}>
              <Text style={[styles.dayEyebrow, { color: colors.accent }]}>{selectedDate === format(today, 'yyyy-MM-dd') ? 'TODAY' : format(parseISO(selectedDate), 'EEEE').toUpperCase()}</Text>
              <Text accessibilityRole="header" style={[styles.dayTitle, { color: colors.text }]}>{format(parseISO(selectedDate), 'MMMM d, yyyy')}</Text>
              <Text style={[styles.dayCount, { color: colors.textMuted }]}>{selectedItems.length ? `${selectedItems.length} workout${selectedItems.length === 1 ? '' : 's'} on your plan` : 'Open space for recovery or training'}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Add workout" style={[styles.addDay, { backgroundColor: colors.accent }]} onPress={openAddMenu}>
              <Ionicons name="add" size={19} color={colors.accentText} /><Text style={[styles.addText, { color: colors.accentText }]}>Add</Text>
            </Pressable>
          </View>
          {selectedItems.length === 0 ? <View style={[styles.empty, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="calendar-clear-outline" size={25} color={colors.textMuted} />
            <View style={styles.flex}><Text style={[styles.emptyTitle, { color: colors.text }]}>Nothing planned yet</Text><Text style={[styles.subtitle, { color: colors.textMuted }]}>Keep it as a rest day or add a workout when it fits.</Text></View>
          </View> : <View style={styles.cards}>{selectedItems.map((item) => <PlannerWorkoutCard key={item.id} item={item} />)}</View>}
        </View>
      </>}
    </ScrollView>
    <PlannerMonthYearPicker visible={pickerVisible} value={month} onClose={() => setPickerVisible(false)} onSelect={changeMonth} />
  </View>;
}

function PlannerWorkoutCard({ item }: { item: ScheduledWorkout }) {
  const colors = useAppColors();
  const available = activeStatuses.has(item.status);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${item.snapshotName}, ${item.status}`}
    onPress={() => router.push({ pathname: '/calendar/[id]', params: { id: item.id } })}
    style={({ pressed }) => [styles.card, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }, pressed && styles.pressed]}>
    <View style={[styles.statusRail, { backgroundColor: item.status === 'completed' ? colors.success : item.status === 'skipped' ? colors.warning : colors.accent }]} />
    <View style={styles.cardBody}>
      <View style={styles.cardHead}><View style={styles.flex}><Text style={[styles.cardName, { color: colors.text }]}>{item.snapshotName}</Text><Text style={[styles.cardTime, { color: colors.textMuted }]}>{item.startTime ?? (item.daypart ? daypartLabels[item.daypart] : 'Anytime')}{item.estimatedDurationMinutes ? ` · ${item.estimatedDurationMinutes} min` : ''}</Text></View><WorkoutTypeBadge type={item.snapshotWorkoutType} /></View>
      <View style={styles.badges}>{item.programId ? <Text style={[styles.program, { color: colors.accent }]}>PROGRAM {item.programWeekNumber ? `· WEEK ${item.programWeekNumber}` : ''}</Text> : null}<Text style={[styles.status, { color: available ? colors.accent : colors.textMuted }]}>{item.status.replaceAll('_', ' ').toUpperCase()}</Text></View>
      {item.notes ? <Text numberOfLines={2} style={[styles.notes, { color: colors.textMuted }]}>{item.notes}</Text> : null}
      <View style={styles.openRow}><Text style={[styles.open, { color: colors.text }]}>Open details</Text><Ionicons name="arrow-forward" size={16} color={colors.text} /></View>
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingBottom: spacing.xxl, gap: spacing.lg }, top: { paddingVertical: spacing.md, gap: spacing.md },
  hero: { flexDirection: 'row', paddingHorizontal: spacing.lg, alignItems: 'flex-start', gap: spacing.md }, flex: { flex: 1 },
  eyebrow: { ...typography.caption, fontWeight: '900', letterSpacing: 1.4 }, title: { ...typography.title, fontSize: 27 }, subtitle: { ...typography.caption, lineHeight: 18 },
  addTop: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  toolbar: { minHeight: 60, marginHorizontal: spacing.lg, borderRadius: 18, borderWidth: 1, padding: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  navButton: { width: 44, height: 44, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  monthSelector: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }, monthText: { ...typography.heading }, yearText: { ...typography.body, fontWeight: '700' },
  today: { minHeight: 44, paddingHorizontal: 10, borderWidth: 1, borderRadius: 12, justifyContent: 'center' }, todayText: { ...typography.label },
  loading: { minHeight: 400, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  dayPanel: { marginHorizontal: spacing.lg, borderRadius: 22, borderWidth: 1, padding: spacing.lg, gap: spacing.lg }, dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dayEyebrow: { ...typography.caption, fontWeight: '900', letterSpacing: 1.1 }, dayTitle: { ...typography.title, fontSize: 23 }, dayCount: { ...typography.caption },
  addDay: { minHeight: 46, paddingHorizontal: spacing.md, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }, addText: { ...typography.label },
  empty: { padding: spacing.lg, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: spacing.md }, emptyTitle: { ...typography.heading }, cards: { gap: spacing.md },
  card: { borderWidth: 1, borderRadius: 18, overflow: 'hidden', flexDirection: 'row' }, pressed: { opacity: 0.78 }, statusRail: { width: 5 }, cardBody: { flex: 1, padding: spacing.lg, gap: spacing.sm },
  cardHead: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }, cardName: { ...typography.heading }, cardTime: { ...typography.caption, marginTop: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, program: { fontSize: 10, fontWeight: '900', letterSpacing: 0.6 }, status: { fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  notes: { ...typography.caption, fontStyle: 'italic' }, openRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.xs }, open: { ...typography.label },
});
