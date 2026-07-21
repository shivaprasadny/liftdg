import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View, Pressable } from 'react-native';

import { HydrationArrow } from '@/components/HydrationArrow';
import { HydrationCelebration } from '@/components/HydrationCelebration';
import { HydrationExpandableSection } from '@/components/HydrationExpandableSection';
import { HydrationMilestoneMessage } from '@/components/HydrationMilestoneMessage';
import { HydrationProgressBar } from '@/components/HydrationProgressBar';
import { HydrationQuickAddSheet } from '@/components/HydrationQuickAddSheet';
import { HydrationQuickButtons } from '@/components/HydrationQuickButtons';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useSettings } from '@/contexts/SettingsContext';
import { useAppColors } from '@/hooks/useAppColors';
import { useDatabase } from '@/hooks/useDatabase';
import { createWaterEntry, deleteWaterEntry, getWaterEntriesInRange } from '@/repositories/waterEntryRepository';
import {
  buildHydrationOverview, formatServingAmount, formatWaterVolume, getHydrationOverviewRangeStart,
  getMilestoneMessage, getRemainingText,
} from '@/services/hydrationService';
import type { HydrationExpansionLevel } from '@/types/hydration';
import { getUserMessage } from '@/utils/errors';

const CELEBRATED_DATE_KEY = 'liftdg:hydration:celebrated-date';

export function HydrationCard() {
  const db = useDatabase();
  const { settings, setSetting } = useSettings();
  const colors = useAppColors();
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof getWaterEntriesInRange>>>([]);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [expansionLevel, setExpansionLevel] = useState<HydrationExpansionLevel>(
    settings.rememberHydrationExpansion ? (settings.hydrationExpansionLevel as HydrationExpansionLevel) : 0,
  );

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

  const addAmount = async (amountMl: number) => {
    try { await createWaterEntry(db, amountMl); await load(); }
    catch (error) { Alert.alert('Could not add water', getUserMessage(error)); }
  };
  const removeLast = async () => {
    const last = overview.today.entries[overview.today.entries.length - 1];
    if (!last) return;
    try { await deleteWaterEntry(db, last.id); await load(); }
    catch (error) { Alert.alert('Could not remove entry', getUserMessage(error)); }
  };
  const toggleExpansion = () => {
    const next: HydrationExpansionLevel = expansionLevel >= 4 ? 0 : ((expansionLevel + 1) as HydrationExpansionLevel);
    setExpansionLevel(next);
    if (settings.rememberHydrationExpansion) void setSetting('hydrationExpansionLevel', next);
  };

  const servingLabel = formatServingAmount(settings.defaultServingSizeMl, settings.waterUnit);
  const accessibilitySummary = `Water today: ${formatWaterVolume(overview.today.totalMl, settings.waterUnit)} of ${formatWaterVolume(overview.today.goalMl, settings.waterUnit)}, ${overview.today.percent}% of goal. ${getRemainingText(overview.today, settings.waterUnit)}.`;

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

      <HydrationArrow expanded={expansionLevel > 0} onPress={toggleExpansion} />
      <HydrationExpandableSection level={expansionLevel} overview={overview} unit={settings.waterUnit} />

      <HydrationQuickAddSheet visible={quickAddVisible} unit={settings.waterUnit} onClose={() => setQuickAddVisible(false)} onSelect={(amount) => void addAmount(amount)} />
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
});
