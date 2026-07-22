import { Alert, Pressable, StyleSheet, Text } from 'react-native';

import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppColors } from '@/hooks/useAppColors';
import type { HydrationSortBy } from '@/types/hydration';

const sortLabels: Record<HydrationSortBy, string> = {
  newest: 'Newest First', oldest: 'Oldest First', highest: 'Highest Intake', lowest: 'Lowest Intake',
  bestCompletion: 'Best Goal Completion', lowestCompletion: 'Lowest Goal Completion',
};
const sortOrder: HydrationSortBy[] = ['newest', 'oldest', 'highest', 'lowest', 'bestCompletion', 'lowestCompletion'];

export function HydrationSortSelector({ value, onChange }: { value: HydrationSortBy; onChange: (value: HydrationSortBy) => void }) {
  const colors = useAppColors();
  const open = () => Alert.alert('Sort By', undefined, [
    ...sortOrder.map((option) => ({ text: `${option === value ? '✓ ' : ''}${sortLabels[option]}`, onPress: () => onChange(option) })),
    { text: 'Cancel', style: 'cancel' as const },
  ]);
  return (
    <Pressable accessibilityRole="button" onPress={open} style={[styles.row, { borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>Sort By</Text>
      <Text style={[styles.value, { color: colors.text }]}>{sortLabels[value]}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1 },
  label: { ...typography.caption }, value: { ...typography.label, fontWeight: '700' },
});
