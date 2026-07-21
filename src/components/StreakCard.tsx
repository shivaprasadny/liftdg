import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import type { StreakSummary } from '@/types/statistics';

export function StreakCard({ streak }: { streak: StreakSummary }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Metric value={String(streak.currentStreakDays)} label="Current Streak" />
        <Metric value={String(streak.longestStreakDays)} label="Longest Streak" />
      </View>
      <View style={styles.row}>
        <Metric value={String(streak.activeDays)} label="Active Days" />
        <Metric value={streak.averageWorkoutsPerWeek.toFixed(1)} label="Workouts / Week" />
      </View>
    </View>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <View style={styles.metric}><Text style={styles.value}>{value}</Text><Text style={styles.label}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  metric: { flex: 1, alignItems: 'center', gap: 2 },
  value: { ...typography.title, color: colors.accent },
  label: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
