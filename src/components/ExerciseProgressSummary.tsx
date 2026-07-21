import { format } from 'date-fns';
import { StyleSheet, Text, View } from 'react-native';

import { StatisticsCard } from '@/components/StatisticsCard';
import { StatisticsGrid } from '@/components/StatisticsGrid';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { formatVolumeKg, formatWeightKg } from '@/services/statisticsService';
import type { ExerciseProgressSummary as ExerciseProgressSummaryModel } from '@/types/statistics';

const dateLabel = (value: string | null) => (value ? format(new Date(value), 'MMM d, yyyy') : '—');

export function ExerciseProgressSummary({ summary }: { summary: ExerciseProgressSummaryModel }) {
  return (
    <View style={styles.container}>
      <Text style={styles.meta}>
        {summary.totalSessions} session{summary.totalSessions === 1 ? '' : 's'} · first {dateLabel(summary.firstWorkoutDate)} · last {dateLabel(summary.lastWorkoutDate)}
      </Text>
      <StatisticsGrid>
        {!summary.isBodyweight && <StatisticsCard label="Best Weight" value={formatWeightKg(summary.bestWeightKg)} />}
        <StatisticsCard label="Best Reps" value={summary.bestReps !== null ? String(summary.bestReps) : '—'} />
        {!summary.isBodyweight && <StatisticsCard label="Best Set Volume" value={summary.bestSetVolumeKg !== null ? formatVolumeKg(summary.bestSetVolumeKg) : '—'} />}
        {!summary.isBodyweight && <StatisticsCard label="Best Workout Volume" value={summary.bestWorkoutVolumeKg !== null ? formatVolumeKg(summary.bestWorkoutVolumeKg) : '—'} />}
        {!summary.isBodyweight && <StatisticsCard label="Best Est. 1RM" value={formatWeightKg(summary.bestEstimatedOneRepMaxKg)} />}
      </StatisticsGrid>
      {summary.isBodyweight && <Text style={styles.note}>This exercise has no logged weight yet, so weight-based metrics are hidden.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  meta: { ...typography.caption, color: colors.textMuted },
  note: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
});
