import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors'; import { spacing } from '@/constants/spacing'; import { typography } from '@/constants/typography';
const choices = ['#35E07A', '#4DA3FF', '#A879FF', '#FF9F43', '#FF6B6B', '#00C2D7', '#FFD166'];
export function PlanColorPicker({ value, onChange }: { value: string | null; onChange: (value: string) => void }) {
  return <View style={styles.wrap}><Text style={styles.label}>Plan color</Text><View style={styles.row}>{choices.map((choice) =>
    <Pressable key={choice} accessibilityRole="radio" accessibilityState={{ checked: value === choice }} accessibilityLabel={`Select ${choice}`}
      onPress={() => onChange(choice)} style={[styles.color, { backgroundColor: choice }, value === choice && styles.selected]} />)}</View></View>;
}
const styles = StyleSheet.create({ wrap: { gap: spacing.sm }, label: { ...typography.label, color: colors.text }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  color: { width: 38, height: 38, borderRadius: 19 }, selected: { borderWidth: 3, borderColor: colors.text } });
