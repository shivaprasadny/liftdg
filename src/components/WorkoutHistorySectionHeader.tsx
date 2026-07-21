import { StyleSheet, Text } from 'react-native';
import { colors } from '@/constants/colors'; import { spacing } from '@/constants/spacing'; import { typography } from '@/constants/typography';
export function WorkoutHistorySectionHeader({ title }: { title: string }) { return <Text style={styles.text}>{title}</Text>; }
const styles = StyleSheet.create({ text: { ...typography.heading, color: colors.text, paddingTop: spacing.lg, paddingBottom: spacing.sm, backgroundColor: colors.background } });
