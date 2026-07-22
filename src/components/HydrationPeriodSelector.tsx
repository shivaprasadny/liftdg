import { ScrollView, StyleSheet } from 'react-native';

import { FilterChip } from '@/components/FilterChip';
import { spacing } from '@/constants/spacing';
import type { HydrationPeriodKind } from '@/types/hydration';

const kinds: HydrationPeriodKind[] = ['day', 'week', 'month', 'quarter', 'year', 'custom'];
const labels: Record<HydrationPeriodKind, string> = { day: 'Day', week: 'Week', month: 'Month', quarter: '3 Months', year: 'Year', custom: 'Custom' };

export function HydrationPeriodSelector({ value, onChange }: { value: HydrationPeriodKind; onChange: (kind: HydrationPeriodKind) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {kinds.map((kind) => <FilterChip key={kind} label={labels[kind]} selected={value === kind} onPress={() => onChange(kind)} />)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: spacing.sm } });
