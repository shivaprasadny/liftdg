import { StyleSheet, View } from 'react-native';

import { HydrationStatsCard } from '@/components/HydrationStatsCard';
import { spacing } from '@/constants/spacing';
import { formatWaterVolume } from '@/services/hydrationService';
import type { HydrationExpansionLevel, HydrationOverview } from '@/types/hydration';
import type { WaterUnit } from '@/types/settings';

interface Props { level: HydrationExpansionLevel; overview: HydrationOverview; unit: WaterUnit; }

/** Reveals week → month → quarter → year rollups progressively as the expansion level increases. */
export function HydrationExpandableSection({ level, overview, unit }: Props) {
  if (level === 0) return null;
  const fmt = (ml: number) => formatWaterVolume(ml, unit);
  return (
    <View style={styles.container}>
      {level >= 1 && (
        <HydrationStatsCard title="This Week" headline={`${fmt(overview.week.totalMl)} / ${fmt(overview.week.goalMl)}`}
          progressPercent={overview.week.percent}
          rows={[{ label: 'Goal Days', value: `${overview.week.goalDaysCount} / ${overview.week.periodDays}` }, { label: 'Average', value: `${fmt(overview.week.averageMl)}/day` }]} />
      )}
      {level >= 2 && (
        <HydrationStatsCard title="This Month" headline={`${fmt(overview.month.totalMl)} / ${fmt(overview.month.goalMl)} · ${overview.month.percent}%`}
          progressPercent={overview.month.percent}
          rows={[{ label: 'Average', value: `${fmt(overview.month.averageMl)}/day` }, { label: 'Goal Days', value: `${overview.month.goalDaysCount} / ${overview.month.periodDays}` }]} />
      )}
      {level >= 3 && (
        <HydrationStatsCard title="Last 3 Months" headline={`${fmt(overview.quarter.averageMl)}/day average`}
          rows={[{ label: 'Goal Success', value: `${overview.quarter.goalSuccessPercent}%` }, { label: 'Total', value: fmt(overview.quarter.totalMl) }]} />
      )}
      {level >= 4 && (
        <HydrationStatsCard title="This Year" headline={fmt(overview.year.totalMl)}
          progressPercent={overview.year.percent}
          rows={[
            { label: 'Goal Completion', value: `${overview.year.percent}%` },
            { label: 'Average', value: `${fmt(overview.year.averageMl)}/day` },
            { label: 'Longest Streak', value: `${overview.year.longestStreakDays} Days` },
            { label: 'Current Streak', value: `${overview.year.currentStreakDays} Days` },
            ...(overview.year.bestMonthLabel ? [{ label: 'Best Month', value: `${overview.year.bestMonthLabel} (${fmt(overview.year.bestMonthTotalMl)})` }] : []),
          ]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({ container: { gap: spacing.sm, marginTop: spacing.sm } });
