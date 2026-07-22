import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { EmptyState } from '@/components/EmptyState';
import { Header } from '@/components/Header';
import { HydrationCalendar } from '@/components/HydrationCalendar';
import { HydrationDateNavigator } from '@/components/HydrationDateNavigator';
import { HydrationDatePickerSheet } from '@/components/HydrationDatePickerSheet';
import { HydrationEntryEditor, type HydrationEntryEditorResult } from '@/components/HydrationEntryEditor';
import { HydrationEntryList } from '@/components/HydrationEntryList';
import { HydrationGroupSelector } from '@/components/HydrationGroupSelector';
import { HydrationHistoryChart } from '@/components/HydrationHistoryChart';
import { HydrationMilestoneMessage } from '@/components/HydrationMilestoneMessage';
import { HydrationPeriodSelector } from '@/components/HydrationPeriodSelector';
import { HydrationProgressBar } from '@/components/HydrationProgressBar';
import { HydrationQuickButtons } from '@/components/HydrationQuickButtons';
import { HydrationSortSelector } from '@/components/HydrationSortSelector';
import { SectionHeader } from '@/components/SectionHeader';
import { StatisticsCard } from '@/components/StatisticsCard';
import { StatisticsGrid } from '@/components/StatisticsGrid';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useSettings } from '@/contexts/SettingsContext';
import { useAppColors } from '@/hooks/useAppColors';
import { useDatabase } from '@/hooks/useDatabase';
import { getGoalHistory } from '@/repositories/hydrationGoalHistoryRepository';
import {
  createWaterEntry, deleteWaterEntry, getAllWaterEntries, updateWaterEntry,
} from '@/repositories/waterEntryRepository';
import {
  buildDayEntryChartPoints, buildHydrationCalendarMonth, buildPeriodChartPoints, canStepForward,
  determineChartAggregation, formatPeriodLabel, formatServingAmount, formatWaterVolume,
  getMilestoneMessage, getRemainingText, goalResolverFromHistory, groupHydrationEntries,
  isCurrentPeriod, periodBoundsFor, pickEncouragingMessage, sortHydrationDayGroupsByCompletion,
  sortHydrationEntries, stepPeriod, summarizeDay, summarizeHydrationPeriod,
  type ChartAggregation, type HydrationCustomRange,
} from '@/services/hydrationService';
import type {
  HydrationGoalHistoryEntry, HydrationGroupBy, HydrationPeriodKind, HydrationSortBy, WaterEntry,
} from '@/types/hydration';
import { getUserMessage } from '@/utils/errors';

function inWindow(entry: WaterEntry, start: Date, end: Date): boolean {
  const time = new Date(entry.loggedAt).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

export default function WaterScreen() {
  const db = useDatabase(); const { settings } = useSettings(); const colors = useAppColors();
  const weekStartsOn = settings.firstDayOfWeek;

  const [allEntries, setAllEntries] = useState<WaterEntry[]>([]);
  const [goalHistory, setGoalHistory] = useState<HydrationGoalHistoryEntry[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [tagline] = useState(() => pickEncouragingMessage());

  const [periodKind, setPeriodKind] = useState<HydrationPeriodKind>('week');
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [customRange, setCustomRange] = useState<HydrationCustomRange>(() => ({ from: format(new Date(), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }));
  const [groupBy, setGroupBy] = useState<HydrationGroupBy>('entries');
  const [sortBy, setSortBy] = useState<HydrationSortBy>('newest');
  const [manualAggregation, setManualAggregation] = useState<ChartAggregation | null>(null);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [editorState, setEditorState] = useState<{ entry: WaterEntry | null } | null>(null);

  const load = useCallback(async () => {
    const [entries, history] = await Promise.all([getAllWaterEntries(db), getGoalHistory(db)]);
    setAllEntries(entries); setGoalHistory(history); setNow(new Date());
  }, [db]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const resolveGoal = useMemo(() => goalResolverFromHistory(goalHistory, settings.dailyWaterGoalMl), [goalHistory, settings.dailyWaterGoalMl]);
  const bounds = useMemo(() => {
    try { return periodBoundsFor(periodKind, referenceDate, weekStartsOn, customRange); } catch { return null; }
  }, [periodKind, referenceDate, weekStartsOn, customRange]);

  const daySummary = useMemo(() => summarizeDay(allEntries, referenceDate, resolveGoal(format(referenceDate, 'yyyy-MM-dd')), settings.defaultServingSizeMl), [allEntries, referenceDate, resolveGoal, settings.defaultServingSizeMl]);
  const periodSummary = useMemo(() => bounds ? summarizeHydrationPeriod(allEntries, bounds.start, bounds.end, now, resolveGoal) : null, [allEntries, bounds, now, resolveGoal]);

  const periodEntries = useMemo(() => bounds ? allEntries.filter((entry) => inWindow(entry, bounds.start, bounds.end)) : [], [allEntries, bounds]);
  const effectiveGroupBy = sortBy === 'bestCompletion' || sortBy === 'lowestCompletion' ? 'day' : groupBy;
  const groupedEntries = useMemo(() => {
    const base = groupHydrationEntries(periodEntries, effectiveGroupBy, weekStartsOn);
    if (sortBy === 'bestCompletion' || sortBy === 'lowestCompletion') {
      const dayTotals = base.map((group) => ({ dateKey: group.key, totalMl: group.entries.reduce((sum, entry) => sum + entry.amountMl, 0), goalMl: resolveGoal(group.key) }));
      const ranked = sortHydrationDayGroupsByCompletion(dayTotals, sortBy === 'bestCompletion' ? 'best' : 'lowest');
      const order = new Map(ranked.map((day, index) => [day.dateKey, index]));
      return [...base].sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0));
    }
    return base.map((group) => ({ ...group, entries: sortHydrationEntries(group.entries, sortBy) }));
  }, [periodEntries, effectiveGroupBy, sortBy, resolveGoal, weekStartsOn]);

  const aggregation: ChartAggregation = periodKind === 'day' ? 'daily'
    : periodKind === 'week' || periodKind === 'month' ? 'daily'
    : periodKind === 'quarter' ? 'weekly'
    : periodKind === 'year' ? 'monthly'
    : manualAggregation ?? (bounds ? determineChartAggregation(bounds.start, bounds.end) : 'daily');
  const chartPoints = useMemo(() => {
    if (periodKind === 'day') return buildDayEntryChartPoints(daySummary);
    if (!bounds) return [];
    return buildPeriodChartPoints(allEntries, bounds.start, bounds.end, aggregation, weekStartsOn);
  }, [periodKind, daySummary, bounds, allEntries, aggregation, weekStartsOn]);

  const calendarDays = useMemo(() => (periodKind === 'month' ? buildHydrationCalendarMonth(allEntries, referenceDate, resolveGoal) : []), [periodKind, allEntries, referenceDate, resolveGoal]);

  const addAmount = async (amountMl: number, loggedAt: string) => {
    try { await createWaterEntry(db, amountMl, loggedAt); await load(); }
    catch (error) { Alert.alert('Could not add water', getUserMessage(error)); }
  };
  const removeLast = async () => {
    const last = daySummary.entries[daySummary.entries.length - 1];
    if (last) await deleteEntry(last);
  };
  const deleteEntry = async (entry: WaterEntry) => {
    try { await deleteWaterEntry(db, entry.id); await load(); }
    catch (error) { Alert.alert('Could not remove entry', getUserMessage(error)); }
  };
  const confirmDelete = (entry: WaterEntry) => Alert.alert('Remove this entry?', undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => void deleteEntry(entry) }]);
  const saveEntry = async (result: HydrationEntryEditorResult) => {
    try {
      if (editorState?.entry) await updateWaterEntry(db, editorState.entry.id, result.amountMl, result.loggedAt, result.notes);
      else await createWaterEntry(db, result.amountMl, result.loggedAt, 'custom_add', result.notes);
      await load();
    } catch (error) { Alert.alert('Could not save this entry', getUserMessage(error)); }
  };

  const isToday = periodKind !== 'custom' && isCurrentPeriod(periodKind, referenceDate, now, weekStartsOn);
  const canGoForward = canStepForward(periodKind, referenceDate, now, weekStartsOn);
  const goalMet = daySummary.totalMl >= daySummary.goalMl;
  const milestone = getMilestoneMessage(daySummary.percent);
  const fmt = (ml: number) => formatWaterVolume(ml, settings.waterUnit);

  return (
    <AppScreen scroll header={<Header title="Water" />}>
      <Text style={[styles.tagline, { color: colors.textMuted }]}>{tagline}</Text>

      <View style={styles.section}>
        <HydrationPeriodSelector value={periodKind} onChange={(kind) => { setPeriodKind(kind); setReferenceDate(new Date()); }} />
        <HydrationDateNavigator label={periodKind === 'custom' ? `${customRange.from} – ${customRange.to}` : formatPeriodLabel(periodKind, referenceDate, weekStartsOn)}
          canGoBack={periodKind !== 'custom'} canGoForward={canGoForward} isCurrent={isToday}
          onBack={() => setReferenceDate((current) => stepPeriod(periodKind, current, -1))}
          onForward={() => setReferenceDate((current) => stepPeriod(periodKind, current, 1))}
          onToday={() => setReferenceDate(new Date())} onPressTitle={() => setDatePickerVisible(true)} />
      </View>

      {periodKind === 'day' ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.amountRow}>
            <Text style={[styles.amount, { color: colors.text }]}>{fmt(daySummary.totalMl)} / {fmt(daySummary.goalMl)}</Text>
            <Text style={[styles.percent, { color: colors.textMuted }]}>{daySummary.percent}%</Text>
          </View>
          <HydrationProgressBar percent={daySummary.percent} atGoal={goalMet} />
          <Text style={[styles.remaining, { color: colors.textMuted }]}>{getRemainingText(daySummary, settings.waterUnit)}</Text>
          {isToday && <HydrationMilestoneMessage message={milestone.message} />}
          {isToday && (
            <HydrationQuickButtons glassCount={daySummary.glassCount} servingLabel={formatServingAmount(settings.defaultServingSizeMl, settings.waterUnit)}
              onAdd={() => void addAmount(settings.defaultServingSizeMl, new Date().toISOString())} onAddLongPress={() => setEditorState({ entry: null })}
              onRemove={() => void removeLast()} onRemoveLongPress={() => setEditorState({ entry: null })} removeDisabled={daySummary.entries.length === 0} />
          )}
        </View>
      ) : periodSummary ? (
        <View style={styles.section}>
          <StatisticsGrid>
            <StatisticsCard label="Total" value={fmt(periodSummary.totalMl)} />
            <StatisticsCard label="Daily Average" value={`${fmt(periodSummary.averageMl)}/day`} />
            <StatisticsCard label="Goal Days" value={`${periodSummary.goalDaysCount} of ${periodSummary.periodDays}`} />
            <StatisticsCard label="Goal Completion" value={`${periodSummary.percent}%`} />
            {periodSummary.bestDayKey && <StatisticsCard label="Best Day" value={`${fmt(periodSummary.bestDayMl)} (${format(new Date(periodSummary.bestDayKey), 'MMM d')})`} />}
            {periodSummary.lowestDayKey && <StatisticsCard label="Lowest Day" value={`${fmt(periodSummary.lowestDayMl)} (${format(new Date(periodSummary.lowestDayKey), 'MMM d')})`} />}
          </StatisticsGrid>
          <HydrationProgressBar percent={periodSummary.percent} atGoal={periodSummary.percent >= 100} />
        </View>
      ) : (
        <EmptyState title="Enter a valid range" message="Choose a valid custom date range to see statistics." />
      )}

      {periodKind === 'month' && (
        <View style={styles.section}>
          <View style={styles.calendarToggleRow}>
            <SectionHeader>Calendar</SectionHeader>
            <Pressable accessibilityRole="button" onPress={() => setShowCalendar((value) => !value)}>
              <Ionicons name={showCalendar ? 'list-outline' : 'calendar-outline'} size={22} color={colors.accent} />
            </Pressable>
          </View>
          {showCalendar && <HydrationCalendar monthReferenceDate={referenceDate} days={calendarDays} onSelectDay={(dateKey) => { setPeriodKind('day'); setReferenceDate(new Date(`${dateKey}T12:00:00`)); }} />}
        </View>
      )}

      <View style={styles.section}>
        <SectionHeader>History</SectionHeader>
        <HydrationHistoryChart points={chartPoints} unit={settings.waterUnit} type={periodKind === 'day' ? 'bar' : periodKind === 'year' ? 'bar' : 'bar'}
          aggregation={periodKind === 'custom' ? aggregation : undefined} onAggregationChange={periodKind === 'custom' ? setManualAggregation : undefined} />
      </View>

      <View style={styles.section}>
        <View style={styles.controlsRow}>
          <HydrationGroupSelector value={groupBy} onChange={setGroupBy} />
          <HydrationSortSelector value={sortBy} onChange={setSortBy} />
        </View>
        <View style={styles.entryHeaderRow}>
          <SectionHeader>Entries</SectionHeader>
          <Pressable accessibilityRole="button" accessibilityLabel="Add an entry for this period" onPress={() => setEditorState({ entry: null })} hitSlop={8}>
            <Ionicons name="add-circle-outline" size={24} color={colors.accent} />
          </Pressable>
        </View>
        <HydrationEntryList groups={groupedEntries} unit={settings.waterUnit} onEdit={(entry) => setEditorState({ entry })} onDelete={confirmDelete} />
      </View>

      <HydrationDatePickerSheet visible={datePickerVisible} kind={periodKind} referenceDate={referenceDate} onClose={() => setDatePickerVisible(false)}
        onSelectDate={setReferenceDate} onSelectCustomRange={(from, to) => setCustomRange({ from, to })} />
      <HydrationEntryEditor visible={editorState !== null} unit={settings.waterUnit} entry={editorState?.entry ?? null} defaultDate={referenceDate}
        onClose={() => setEditorState(null)} onSave={(result) => void saveEntry(result)} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  tagline: { ...typography.body, textAlign: 'center', marginBottom: spacing.md },
  section: { gap: spacing.sm, marginBottom: spacing.xl },
  card: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, marginBottom: spacing.xl },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  amount: { ...typography.heading }, percent: { ...typography.body, fontWeight: '700' }, remaining: { ...typography.caption },
  calendarToggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  controlsRow: { flexDirection: 'row', gap: spacing.sm },
  entryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
