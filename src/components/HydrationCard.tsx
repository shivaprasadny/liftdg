import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View, Pressable } from 'react-native';

import { HydrationArrow } from '@/components/HydrationArrow';
import { HydrationCelebration } from '@/components/HydrationCelebration';
import { HydrationMilestoneMessage } from '@/components/HydrationMilestoneMessage';
import { HydrationProgressBar } from '@/components/HydrationProgressBar';
import { HydrationQuickAddSheet } from '@/components/HydrationQuickAddSheet';
import { HydrationQuickButtons } from '@/components/HydrationQuickButtons';
import { HydrationStatsCard } from '@/components/HydrationStatsCard';
import { HydrationStatsCarousel, type HydrationCarouselPageData } from '@/components/HydrationStatsCarousel';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useSettings } from '@/contexts/SettingsContext';
import { useAppColors } from '@/hooks/useAppColors';
import { useDatabase } from '@/hooks/useDatabase';
import { createWaterEntry, deleteWaterEntry, getWaterEntriesInRange } from '@/repositories/waterEntryRepository';
import {
  buildHydrationOverview, formatMonthLabel, formatQuarterRangeLabel, formatServingAmount, formatWaterVolume,
  formatWeekRangeLabel, formatYearLabel, getHydrationOverviewRangeStart, getMilestoneMessage, getRemainingText,
} from '@/services/hydrationService';
import type { HydrationOverview } from '@/types/hydration';
import type { WaterUnit } from '@/types/settings';
import { getUserMessage } from '@/utils/errors';

const CELEBRATED_DATE_KEY = 'liftdg:hydration:celebrated-date';

function buildCarouselPages(overview: HydrationOverview, unit: WaterUnit, now: Date, weekStartsOn: 0 | 1): HydrationCarouselPageData[] {
  const fmt = (ml: number) => formatWaterVolume(ml, unit);
  return [
    {
      label: 'This Week',
      content: <HydrationStatsCard title="This Week" headline={`${fmt(overview.week.totalMl)} / ${fmt(overview.week.goalMl)}`}
        progressPercent={overview.week.percent} dateRangeLabel={formatWeekRangeLabel(now, weekStartsOn)}
        rows={[{ label: 'Average', value: `${fmt(overview.week.averageMl)}/day` }, { label: 'Goal Days', value: `${overview.week.goalDaysCount} of ${overview.week.periodDays}` }]} />,
    },
    {
      label: 'This Month',
      content: <HydrationStatsCard title={formatMonthLabel(now)} headline={`${fmt(overview.month.totalMl)} / ${fmt(overview.month.goalMl)}`}
        progressPercent={overview.month.percent}
        rows={[{ label: 'Average', value: `${fmt(overview.month.averageMl)}/day` }, { label: 'Goal Days', value: `${overview.month.goalDaysCount} of ${overview.month.periodDays}` }]} />,
    },
    {
      label: 'Last 3 Months',
      content: <HydrationStatsCard title="Last 3 Months" headline={`Total: ${fmt(overview.quarter.totalMl)}`} dateRangeLabel={formatQuarterRangeLabel(now)}
        rows={[
          { label: 'Average', value: `${fmt(overview.quarter.averageMl)}/day` },
          { label: 'Goal Success', value: `${overview.quarter.goalSuccessPercent}%` },
          { label: 'Goal Days', value: String(overview.quarter.goalDaysCount) },
          ...(overview.quarter.trendPercent !== null ? [{ label: 'Trend', value: `${overview.quarter.trendPercent >= 0 ? '+' : ''}${overview.quarter.trendPercent}% vs. previous 3 months` }] : []),
        ]} />,
    },
    {
      label: 'This Year',
      content: <HydrationStatsCard title={formatYearLabel(now)} headline={`Total: ${fmt(overview.year.totalMl)}`}
        progressPercent={overview.year.percent}
        rows={[
          { label: 'Average', value: `${fmt(overview.year.averageMl)}/day` },
          { label: 'Goal Completion', value: `${overview.year.percent}%` },
          { label: 'Longest Streak', value: `${overview.year.longestStreakDays} days` },
          { label: 'Current Streak', value: `${overview.year.currentStreakDays} days` },
          ...(overview.year.bestMonthLabel ? [{ label: 'Best Month', value: overview.year.bestMonthLabel }] : []),
        ]} />,
    },
  ];
}

export function HydrationCard() {
  const db = useDatabase();
  const { settings, setSetting } = useSettings();
  const colors = useAppColors();
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof getWaterEntriesInRange>>>([]);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [expanded, setExpanded] = useState(settings.rememberHydrationExpansion ? settings.hydrationHomeExpanded : false);
  const [statsPage, setStatsPage] = useState(settings.rememberHydrationExpansion ? settings.hydrationHomeStatsPage : 0);

  const load = useCallback(async () => {
    const now = new Date();
    const rangeStart = getHydrationOverviewRangeStart(now);
    try { setEntries(await getWaterEntriesInRange(db, rangeStart.toISOString(), now.toISOString())); }
    catch (error) { if (__DEV__) console.error('Could not load water entries', error); }
  }, [db]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const overview = useMemo(
    () => buildHydrationOverview(entries, new Date(), settings.dailyWaterGoalMl, settings.defaultServingSizeMl, settings.firstDayOfWeek),
    [entries, settings.dailyWaterGoalMl, settings.defaultServingSizeMl, settings.firstDayOfWeek],
  );

  const goalMet = overview.today.totalMl >= overview.today.goalMl;
  const milestone = getMilestoneMessage(overview.today.percent);

  /** Celebrate once per day the goal is first reached; a stored date guards against replay or re-triggering after dipping back below goal. */
  useEffect(() => {
    if (!goalMet || settings.hydrationCelebration === 'off') return;
    let cancelled = false;
    void AsyncStorage.getItem(CELEBRATED_DATE_KEY).then((stored) => {
      if (cancelled || stored === overview.today.dateKey) return;
      setCelebrating(true);
      void AsyncStorage.setItem(CELEBRATED_DATE_KEY, overview.today.dateKey);
      setTimeout(() => setCelebrating(false), 2600);
    });
    return () => { cancelled = true; };
  }, [goalMet, overview.today.dateKey, settings.hydrationCelebration]);

  const addAmount = async (amountMl: number, source: 'quick_add' | 'custom_add' = 'quick_add') => {
    try { await createWaterEntry(db, amountMl, new Date().toISOString(), source); await load(); }
    catch (error) { Alert.alert('Could not add water', getUserMessage(error)); }
  };
  const removeLast = async () => {
    const last = overview.today.entries[overview.today.entries.length - 1];
    if (!last) return;
    try { await deleteWaterEntry(db, last.id); await load(); }
    catch (error) { Alert.alert('Could not remove entry', getUserMessage(error)); }
  };

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    if (settings.rememberHydrationExpansion) void setSetting('hydrationHomeExpanded', next);
  };
  const changeStatsPage = (page: number) => {
    setStatsPage(page);
    if (settings.rememberHydrationExpansion) void setSetting('hydrationHomeStatsPage', page);
  };

  const servingLabel = formatServingAmount(settings.defaultServingSizeMl, settings.waterUnit);
  const accessibilitySummary = `Water today: ${formatWaterVolume(overview.today.totalMl, settings.waterUnit)} of ${formatWaterVolume(overview.today.goalMl, settings.waterUnit)}, ${overview.today.percent}% of goal. ${getRemainingText(overview.today, settings.waterUnit)}.`;
  const carouselPages = useMemo(() => buildCarouselPages(overview, settings.waterUnit, new Date(), settings.firstDayOfWeek), [overview, settings.waterUnit, settings.firstDayOfWeek]);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilitySummary} onPress={() => router.push('/water')} style={styles.tapArea}>
        <Text style={[styles.title, { color: colors.text }]}>💧 Water Today</Text>
        <View style={styles.amountRow}>
          <Text style={[styles.amount, { color: colors.text }]}>
            {formatWaterVolume(overview.today.totalMl, settings.waterUnit)} / {formatWaterVolume(overview.today.goalMl, settings.waterUnit)}
          </Text>
          <Text style={[styles.percent, { color: colors.textMuted }]}>{overview.today.percent}%</Text>
        </View>
        <HydrationProgressBar percent={overview.today.percent} atGoal={goalMet} />
        <Text style={[styles.remaining, { color: colors.textMuted }]}>{getRemainingText(overview.today, settings.waterUnit)}</Text>
        <HydrationMilestoneMessage message={milestone.message} />
      </Pressable>

      <HydrationQuickButtons glassCount={overview.today.glassCount} servingLabel={servingLabel}
        onAdd={() => void addAmount(settings.defaultServingSizeMl)} onAddLongPress={() => setQuickAddVisible(true)}
        onRemove={() => void removeLast()} onRemoveLongPress={() => router.push('/water')}
        removeDisabled={overview.today.entries.length === 0} />

      <HydrationCelebration visible={celebrating} celebrationStyle={settings.hydrationCelebration} />

      <HydrationArrow expanded={expanded} onPress={toggleExpanded} />
      {expanded && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
      {expanded && <HydrationStatsCarousel page={statsPage} onPageChange={changeStatsPage} pages={carouselPages} />}

      <HydrationQuickAddSheet visible={quickAddVisible} unit={settings.waterUnit}
        onClose={() => setQuickAddVisible(false)} onSelect={(amount) => void addAmount(amount, 'custom_add')} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, marginBottom: spacing.xl },
  tapArea: { gap: spacing.xs },
  title: { ...typography.label },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  amount: { ...typography.heading },
  percent: { ...typography.body, fontWeight: '700' },
  remaining: { ...typography.caption },
  divider: { height: StyleSheet.hairlineWidth },
});
