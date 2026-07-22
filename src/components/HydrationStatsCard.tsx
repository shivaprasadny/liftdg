import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { HydrationProgressBar } from '@/components/HydrationProgressBar';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppColors } from '@/hooks/useAppColors';

export interface HydrationStatRow { label: string; value: string; }

interface Props {
  title: string;
  dateRangeLabel?: string;
  headline: string;
  rows: HydrationStatRow[];
  progressPercent?: number;
}

/** One period rollup (week/month/quarter/year); fades in as the carousel page becomes visible. */
export function HydrationStatsCard({ title, dateRangeLabel, headline, rows, progressPercent }: Props) {
  const colors = useAppColors();
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(300)}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textMuted }]}>{title}</Text>
      {dateRangeLabel && <Text style={[styles.dateRange, { color: colors.textMuted }]}>{dateRangeLabel}</Text>}
      <Text style={[styles.headline, { color: colors.text }]}>{headline}</Text>
      {progressPercent !== undefined && <HydrationProgressBar percent={progressPercent} atGoal={progressPercent >= 100} />}
      <View style={styles.rows}>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{row.label}</Text>
            <Text style={[styles.rowValue, { color: colors.text }]}>{row.value}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm },
  title: { ...typography.label, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateRange: { ...typography.caption },
  headline: { ...typography.heading },
  rows: { gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { ...typography.caption },
  rowValue: { ...typography.caption, fontWeight: '700' },
});
