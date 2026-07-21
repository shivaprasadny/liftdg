import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

interface Props { label: string; value: string; comparison?: ReactNode; }

export function StatisticsCard({ label, value, comparison }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {comparison}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexGrow: 1, flexBasis: '47%', padding: spacing.md, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
  value: { ...typography.heading, color: colors.text },
  label: { ...typography.caption, color: colors.textMuted },
});
