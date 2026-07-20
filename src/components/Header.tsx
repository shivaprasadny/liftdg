import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
export function Header({ title, action }: { title: string; action?: ReactNode }) {
  return <View style={styles.header}><Text style={styles.title}>{title}</Text>{action}</View>;
}
const styles = StyleSheet.create({ header: { minHeight: 60, paddingHorizontal: spacing.lg,
  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.title, color: colors.text } });
