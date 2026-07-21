import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Circle, Line, Polyline, Rect, Svg } from 'react-native-svg';

import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

export interface ChartPoint { label: string; value: number; }

interface Props {
  points: ChartPoint[];
  type: 'line' | 'bar';
  unitLabel: string;
  loading?: boolean;
  emptyMessage?: string;
  formatValue?: (value: number) => string;
}

const CHART_HEIGHT = 150;
const PADDING = { top: 16, bottom: 24, left: 8, right: 8 };

/**
 * Minimal SVG line/bar chart. Deliberately simple (no animation, no external chart library) so a
 * chart bug never breaks the rest of Progress: callers can always fall back to the underlying
 * chart-ready data (StatisticsCard/PersonalRecordCard) if this component is removed.
 */
export function ProgressChart({ points, type, unitLabel, loading, emptyMessage = 'No data is available for this period.', formatValue }: Props) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  if (loading) {
    return <View style={[styles.card, styles.center]}><ActivityIndicator color={colors.accent} /></View>;
  }
  if (points.length === 0) {
    return <View style={[styles.card, styles.center]}><Text style={styles.empty}>{emptyMessage}</Text></View>;
  }

  const values = points.map((point) => point.value);
  const maxValue = Math.max(...values, 0);
  const minValue = type === 'bar' ? 0 : Math.min(...values, 0);
  const range = maxValue - minValue || 1;
  const plotWidth = Math.max(width - PADDING.left - PADDING.right, 1);
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0;
  const barWidth = points.length > 0 ? Math.min(28, plotWidth / points.length - 6) : 0;

  const xFor = (index: number) => PADDING.left + (points.length > 1 ? index * stepX : plotWidth / 2);
  const yFor = (value: number) => PADDING.top + plotHeight - ((value - minValue) / range) * plotHeight;

  const format = formatValue ?? ((value: number) => value.toFixed(1));
  const activePoint = selected !== null ? points[selected] : points[points.length - 1];
  const first = points[0]; const last = points[points.length - 1];
  const midIndex = Math.floor((points.length - 1) / 2);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.selectedLabel}>{activePoint.label}</Text>
        <Text style={styles.selectedValue}>{format(activePoint.value)} {unitLabel}</Text>
      </View>
      <View onLayout={onLayout} style={styles.chartArea}>
        {width > 0 && (
          <Svg width={width} height={CHART_HEIGHT} accessibilityLabel={`${type === 'line' ? 'Line' : 'Bar'} chart of ${unitLabel} from ${first.label} to ${last.label}, ranging from ${format(minValue)} to ${format(maxValue)}`}>
            <Line x1={PADDING.left} y1={yFor(minValue)} x2={width - PADDING.right} y2={yFor(minValue)} stroke={colors.border} strokeWidth={1} />
            {type === 'line' ? (
              <>
                <Polyline points={points.map((point, index) => `${xFor(index)},${yFor(point.value)}`).join(' ')} fill="none" stroke={colors.accent} strokeWidth={2} />
                {points.map((point, index) => (
                  <Circle key={index} cx={xFor(index)} cy={yFor(point.value)} r={selected === index ? 5 : 3} fill={colors.accent} />
                ))}
              </>
            ) : points.map((point, index) => (
              <Rect key={index} x={xFor(index) - barWidth / 2} y={yFor(point.value)} width={Math.max(barWidth, 4)}
                height={Math.max(yFor(minValue) - yFor(point.value), 1)} rx={3} fill={selected === index ? colors.accent : colors.accentPressed} />
            ))}
          </Svg>
        )}
        {width > 0 && (
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.touchRow}>
              {points.map((_, index) => (
                <Pressable key={index} accessibilityRole="button" accessibilityLabel={`${points[index].label}: ${format(points[index].value)} ${unitLabel}`}
                  onPress={() => setSelected(index === selected ? null : index)} style={{ width: plotWidth / points.length, height: CHART_HEIGHT }} />
              ))}
            </View>
          </View>
        )}
      </View>
      <View style={styles.axisRow}>
        <Text style={styles.axisLabel}>{first.label}</Text>
        {points.length > 2 && <Text style={styles.axisLabel}>{points[midIndex].label}</Text>}
        <Text style={styles.axisLabel}>{last.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  center: { minHeight: CHART_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  empty: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  selectedLabel: { ...typography.caption, color: colors.textMuted },
  selectedValue: { ...typography.heading, color: colors.text },
  chartArea: { width: '100%', height: CHART_HEIGHT },
  touchRow: { flexDirection: 'row', paddingLeft: PADDING.left },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { ...typography.caption, color: colors.textMuted },
});
