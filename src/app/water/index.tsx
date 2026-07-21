import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { EmptyState } from '@/components/EmptyState';
import { Header } from '@/components/Header';
import { HydrationExpandableSection } from '@/components/HydrationExpandableSection';
import { HydrationMilestoneMessage } from '@/components/HydrationMilestoneMessage';
import { HydrationProgressBar } from '@/components/HydrationProgressBar';
import { HydrationQuickButtons } from '@/components/HydrationQuickButtons';
import { SectionHeader } from '@/components/SectionHeader';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useSettings } from '@/contexts/SettingsContext';
import { useAppColors } from '@/hooks/useAppColors';
import { useDatabase } from '@/hooks/useDatabase';
import { createWaterEntry, deleteWaterEntry, getWaterEntriesInRange } from '@/repositories/waterEntryRepository';
import {
  buildHydrationOverview, formatServingAmount, formatWaterVolume, getHydrationOverviewRangeStart,
  getMilestoneMessage, getRemainingText, pickEncouragingMessage,
} from '@/services/hydrationService';
import type { WaterEntry } from '@/types/hydration';
import { getUserMessage } from '@/utils/errors';

export default function WaterScreen() {
  const db = useDatabase(); const { settings } = useSettings(); const colors = useAppColors();
  const [entries, setEntries] = useState<WaterEntry[]>([]);
  const [tagline] = useState(() => pickEncouragingMessage());

  const load = useCallback(async () => {
    const now = new Date();
    setEntries(await getWaterEntriesInRange(db, getHydrationOverviewRangeStart(now).toISOString(), now.toISOString()));
  }, [db]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const overview = useMemo(
    () => buildHydrationOverview(entries, new Date(), settings.dailyWaterGoalMl, settings.defaultServingSizeMl, settings.firstDayOfWeek),
    [entries, settings.dailyWaterGoalMl, settings.defaultServingSizeMl, settings.firstDayOfWeek],
  );
  const goalMet = overview.today.totalMl >= overview.today.goalMl;
  const milestone = getMilestoneMessage(overview.today.percent);

  const addAmount = async (amountMl: number) => {
    try { await createWaterEntry(db, amountMl); await load(); }
    catch (error) { Alert.alert('Could not add water', getUserMessage(error)); }
  };
  const removeEntry = (id: string) => {
    Alert.alert('Remove this entry?', undefined, [{ text: 'Cancel', style: 'cancel' }, {
      text: 'Remove', style: 'destructive',
      onPress: () => void deleteWaterEntry(db, id).then(load).catch((error) => Alert.alert('Could not remove entry', getUserMessage(error))),
    }]);
  };
  const removeLast = async () => {
    const last = overview.today.entries[overview.today.entries.length - 1];
    if (last) removeEntry(last.id);
  };

  return (
    <AppScreen scroll header={<Header title="Water" />}>
      <Text style={[styles.tagline, { color: colors.textMuted }]}>{tagline}</Text>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.amountRow}>
          <Text style={[styles.amount, { color: colors.text }]}>{formatWaterVolume(overview.today.totalMl, settings.waterUnit)} / {formatWaterVolume(overview.today.goalMl, settings.waterUnit)}</Text>
          <Text style={[styles.percent, { color: colors.textMuted }]}>{overview.today.percent}%</Text>
        </View>
        <HydrationProgressBar percent={overview.today.percent} atGoal={goalMet} />
        <Text style={[styles.remaining, { color: colors.textMuted }]}>{getRemainingText(overview.today, settings.waterUnit)}</Text>
        <HydrationMilestoneMessage message={milestone.message} />
        <HydrationQuickButtons glassCount={overview.today.glassCount} servingLabel={formatServingAmount(settings.defaultServingSizeMl, settings.waterUnit)}
          onAdd={() => void addAmount(settings.defaultServingSizeMl)} onAddLongPress={() => void addAmount(settings.defaultServingSizeMl)}
          onRemove={() => void removeLast()} onRemoveLongPress={() => void removeLast()} removeDisabled={overview.today.entries.length === 0} />
      </View>

      <SectionHeader>Today&rsquo;s Entries</SectionHeader>
      {overview.today.entries.length === 0 ? <EmptyState title="No water logged yet" message="Add your first glass to start tracking today." />
        : [...overview.today.entries].reverse().map((entry) => (
          <View key={entry.id} style={[styles.entryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.entryAmount, { color: colors.text }]}>{formatServingAmount(entry.amountMl, settings.waterUnit)}</Text>
            <Text style={[styles.entryTime, { color: colors.textMuted }]}>{format(new Date(entry.loggedAt), 'h:mm a')}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Delete this entry" onPress={() => removeEntry(entry.id)} hitSlop={8}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </Pressable>
          </View>
        ))}

      <SectionHeader>Statistics</SectionHeader>
      <HydrationExpandableSection level={4} overview={overview} unit={settings.waterUnit} />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  tagline: { ...typography.body, textAlign: 'center', marginBottom: spacing.md },
  card: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, gap: spacing.md, marginBottom: spacing.xl },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  amount: { ...typography.heading }, percent: { ...typography.body, fontWeight: '700' }, remaining: { ...typography.caption },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm },
  entryAmount: { ...typography.body, fontWeight: '700', flex: 1 }, entryTime: { ...typography.caption },
});
