import { StyleSheet, View } from 'react-native';

import { FilterChip } from '@/components/FilterChip';
import { ProgressChart } from '@/components/ProgressChart';
import { spacing } from '@/constants/spacing';
import type { ChartAggregation, HydrationChartPoint } from '@/services/hydrationService';
import { millilitersToDisplayUnit } from '@/services/hydrationService';
import type { WaterUnit } from '@/types/settings';

interface Props {
  points: HydrationChartPoint[];
  unit: WaterUnit;
  type?: 'line' | 'bar';
  /** Only custom ranges let the user override the automatic daily/weekly/monthly aggregation. */
  aggregation?: ChartAggregation; onAggregationChange?: (value: ChartAggregation) => void;
}

export function HydrationHistoryChart({ points, unit, type = 'bar', aggregation, onAggregationChange }: Props) {
  return (
    <View style={styles.container}>
      {aggregation && onAggregationChange && (
        <View style={styles.row}>
          <FilterChip label="Daily" selected={aggregation === 'daily'} onPress={() => onAggregationChange('daily')} />
          <FilterChip label="Weekly" selected={aggregation === 'weekly'} onPress={() => onAggregationChange('weekly')} />
          <FilterChip label="Monthly" selected={aggregation === 'monthly'} onPress={() => onAggregationChange('monthly')} />
        </View>
      )}
      <ProgressChart type={type} unitLabel={unit === 'us' ? 'fl oz' : 'L'}
        points={points.map((point) => ({ label: point.label, value: millilitersToDisplayUnit(point.value, unit) }))}
        formatValue={(value) => value.toFixed(1)} emptyMessage="No water logged for this period." />
    </View>
  );
}

const styles = StyleSheet.create({ container: { gap: spacing.sm }, row: { flexDirection: 'row', gap: spacing.sm } });
