import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppColors } from '@/hooks/useAppColors';
import type { HydrationGroupBy } from '@/types/hydration';

const groupLabels: Record<HydrationGroupBy, string> = { entries: 'Entries', day: 'Day', week: 'Week', month: 'Month', quarter: 'Quarter', year: 'Year' };
const groupOrder: HydrationGroupBy[] = ['entries', 'day', 'week', 'month', 'quarter', 'year'];

export function HydrationGroupSelector({ value, onChange }: { value: HydrationGroupBy; onChange: (value: HydrationGroupBy) => void }) {
  const colors = useAppColors();
  const open = () => Alert.alert('Group By', undefined, [
    ...groupOrder.map((option) => ({ text: `${option === value ? '✓ ' : ''}${groupLabels[option]}`, onPress: () => onChange(option) })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
  return (
    <Pressable accessibilityRole="button" onPress={open} style={[styles.row, { borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>Group By</Text>
      <Text style={[styles.value, { color: colors.text }]}>{groupLabels[value]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  label: { ...typography.caption }, value: { ...typography.label, fontWeight: '700' },
});
