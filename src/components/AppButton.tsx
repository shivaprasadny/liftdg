import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

interface Props extends ComponentProps<typeof Pressable> {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

export function AppButton({ label, variant = 'primary', loading, disabled, style, ...props }: Props) {
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} disabled={disabled || loading}
      style={({ pressed }) => [styles.base, styles[variant], pressed && styles.pressed,
        (disabled || loading) && styles.disabled, typeof style === 'function' ? style({ pressed, hovered: false }) : style]}
      {...props}>
      {loading ? <ActivityIndicator color={variant === 'primary' ? colors.accentText : colors.text} />
        : <Text style={[styles.text, variant === 'primary' && styles.primaryText]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 52, paddingHorizontal: spacing.xl, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  primary: { backgroundColor: colors.accent, borderColor: colors.accent },
  secondary: { backgroundColor: colors.surfaceElevated, borderColor: colors.border },
  danger: { backgroundColor: 'transparent', borderColor: colors.danger },
  pressed: { opacity: 0.76 }, disabled: { opacity: 0.45 },
  text: { ...typography.label, color: colors.text }, primaryText: { color: colors.accentText },
});
