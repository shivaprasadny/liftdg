import { Ionicons } from '@expo/vector-icons'; import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/colors'; import { radius, spacing } from '@/constants/spacing';
export function ReorderControls({ onUp, onDown, canUp, canDown }: { onUp: () => void; onDown: () => void; canUp: boolean; canDown: boolean }) {
  return <View style={styles.row}><Pressable accessibilityRole="button" accessibilityLabel="Move exercise up" accessibilityState={{ disabled: !canUp }} disabled={!canUp} onPress={onUp} style={[styles.button, !canUp && styles.disabled]}><Ionicons name="arrow-up" size={19} color={colors.text} /></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Move exercise down" accessibilityState={{ disabled: !canDown }} disabled={!canDown} onPress={onDown} style={[styles.button, !canDown && styles.disabled]}><Ionicons name="arrow-down" size={19} color={colors.text} /></Pressable></View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: spacing.sm }, button: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' }, disabled: { opacity: .3 } });
