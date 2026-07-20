import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

interface Props { title: string; message: string; }
export function EmptyState({ title, message }: Props) {
  return <View style={styles.container}><Ionicons name="barbell-outline" size={38} color={colors.textMuted} />
    <Text style={styles.title}>{title}</Text><Text style={styles.message}>{message}</Text></View>;
}
const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center',
  padding: spacing.xxl, gap: spacing.sm }, title: { ...typography.heading, color: colors.text, textAlign: 'center' },
  message: { ...typography.body, color: colors.textMuted, textAlign: 'center' } });
