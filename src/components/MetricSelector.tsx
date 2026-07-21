import { ScrollView, StyleSheet } from 'react-native';

import { FilterChip } from '@/components/FilterChip';
import { spacing } from '@/constants/spacing';
import { progressChartMetrics, type ProgressChartMetric } from '@/types/statistics';

const labels: Record<ProgressChartMetric, string> = {
  maxWeight: 'Max Weight', estimatedOneRepMax: 'Est. 1RM', bestSetVolume: 'Best Set Volume',
  totalVolume: 'Total Volume', totalReps: 'Total Reps',
};

interface Props {
  value: ProgressChartMetric;
  onChange: (metric: ProgressChartMetric) => void;
  availableMetrics?: readonly ProgressChartMetric[];
}

export function MetricSelector({ value, onChange, availableMetrics = progressChartMetrics }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {availableMetrics.map((metric) => (
        <FilterChip key={metric} label={labels[metric]} selected={value === metric} onPress={() => onChange(metric)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: spacing.sm } });
