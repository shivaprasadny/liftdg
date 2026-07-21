import { ScrollView, StyleSheet } from 'react-native';

import { FilterChip } from '@/components/FilterChip';
import { spacing } from '@/constants/spacing';
import { statisticsDatePresets, type StatisticsDatePreset } from '@/types/statistics';

const labels: Record<StatisticsDatePreset, string> = {
  week: 'This Week', month: 'This Month', '30d': 'Last 30 Days', '3m': 'Last 3 Months',
  '6m': 'Last 6 Months', year: 'This Year', all: 'All Time', custom: 'Custom',
};

interface Props { value: StatisticsDatePreset; onChange: (preset: StatisticsDatePreset) => void; }

export function DateRangeSelector({ value, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {statisticsDatePresets.map((preset) => (
        <FilterChip key={preset} label={labels[preset]} selected={value === preset} onPress={() => onChange(preset)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs } });
