import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

interface Props { label: string; selected: boolean; onPress: () => void; }

export function FilterChip({ label, selected, onPress }: Props) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
    style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && styles.pressed]}>
    <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  chip: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.md,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  selected: { backgroundColor: colors.accent, borderColor: colors.accent }, pressed: { opacity: 0.75 },
  label: { ...typography.label, color: colors.textMuted }, selectedLabel: { color: colors.accentText },
});
