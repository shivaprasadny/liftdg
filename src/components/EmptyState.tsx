import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { AppButton } from './AppButton';

interface Props { title: string; message: string; actionLabel?: string; onAction?: () => void; }
export function EmptyState({ title, message, actionLabel, onAction }: Props) {
  return <View style={styles.container} accessible accessibilityLabel={`${title}. ${message}`}><Ionicons accessibilityElementsHidden name="barbell-outline" size={38} color={colors.textMuted} />
    <Text accessibilityRole="header" style={styles.title}>{title}</Text><Text style={styles.message}>{message}</Text>{actionLabel&&onAction?<AppButton label={actionLabel} onPress={onAction}/>:null}</View>;
}
const styles = StyleSheet.create({ container: { flex: 1, alignItems: 'center', justifyContent: 'center',
  padding: spacing.xxl, gap: spacing.sm }, title: { ...typography.heading, color: colors.text, textAlign: 'center' },
  message: { ...typography.body, color: colors.textMuted, textAlign: 'center' } });
