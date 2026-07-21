import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppColors } from '@/hooks/useAppColors';

interface Props {
  glassCount: number;
  servingLabel: string;
  onAdd: () => void;
  onAddLongPress: () => void;
  onRemove: () => void;
  onRemoveLongPress: () => void;
  removeDisabled: boolean;
}

export function HydrationQuickButtons({ glassCount, servingLabel, onAdd, onAddLongPress, onRemove, onRemoveLongPress, removeDisabled }: Props) {
  const colors = useAppColors();
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${servingLabel}`} disabled={removeDisabled}
        onPress={onRemove} onLongPress={onRemoveLongPress}
        style={({ pressed }) => [styles.button, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }, pressed && styles.pressed, removeDisabled && styles.disabled]}>
        <Ionicons name="remove" size={26} color={colors.text} />
      </Pressable>
      <Text style={[styles.count, { color: colors.text }]}>{glassCount} {glassCount === 1 ? 'Glass' : 'Glasses'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Add ${servingLabel}`} onPress={onAdd} onLongPress={onAddLongPress}
        style={({ pressed }) => [styles.button, { backgroundColor: colors.accent, borderColor: colors.accent }, pressed && styles.pressed]}>
        <Ionicons name="add" size={26} color={colors.accentText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  button: { width: 56, height: 56, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },
  count: { ...typography.label, flex: 1, textAlign: 'center' },
});
