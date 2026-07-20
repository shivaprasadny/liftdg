import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

interface Props extends TextInputProps { label?: string; error?: string; }

export const AppInput = forwardRef<TextInput, Props>(function AppInput(
  { label, error, style, ...props }, ref,
) {
  return <View style={styles.wrapper}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TextInput ref={ref} placeholderTextColor={colors.textMuted}
      style={[styles.input, props.multiline && styles.multiline, error && styles.inputError, style]} {...props} />
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </View>;
});

const styles = StyleSheet.create({
  wrapper: { gap: spacing.sm }, label: { ...typography.label, color: colors.text },
  input: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, color: colors.text, paddingHorizontal: spacing.md, ...typography.body },
  multiline: { minHeight: 110, paddingTop: spacing.md, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger }, error: { ...typography.caption, color: colors.danger },
});
