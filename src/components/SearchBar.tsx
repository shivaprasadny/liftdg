import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TextInput, View } from 'react-native';

import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';

interface Props { value: string; onChangeText: (value: string) => void; placeholder?: string; }

export function SearchBar({ value, onChangeText, placeholder = 'Search exercises' }: Props) {
  return <View style={styles.wrapper}>
    <Ionicons name="search" size={20} color={colors.textMuted} />
    <TextInput accessibilityLabel={placeholder} value={value} onChangeText={onChangeText}
      placeholder={placeholder} placeholderTextColor={colors.textMuted} style={styles.input} />
  </View>;
}

const styles = StyleSheet.create({
  wrapper: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border },
  input: { flex: 1, color: colors.text, fontSize: 16 },
});
