import { StyleSheet, Text, View } from 'react-native';
import { AppInput } from './AppInput'; import { colors } from '@/constants/colors'; import { spacing } from '@/constants/spacing'; import { typography } from '@/constants/typography';
import type { PlanExerciseInput } from '@/types/workoutPlan';
const numberValue = (value: number | null) => value == null ? '' : String(value);
const parse = (value: string): number | null => value.trim() === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
export function PlanTargetEditor({ value, onChange }: { value: PlanExerciseInput; onChange: (patch: Partial<PlanExerciseInput>) => void }) {
  return <View style={styles.wrap}><Text style={styles.label}>Targets</Text><View style={styles.row}>
    <AppInput containerStyle={styles.input} label="Sets" keyboardType="number-pad" value={numberValue(value.targetSets)} onChangeText={(text) => onChange({ targetSets: parse(text) })} />
    <AppInput containerStyle={styles.input} label="Min reps" keyboardType="number-pad" value={numberValue(value.targetRepsMin)} onChangeText={(text) => onChange({ targetRepsMin: parse(text) })} />
    <AppInput containerStyle={styles.input} label="Max reps" keyboardType="number-pad" value={numberValue(value.targetRepsMax)} onChangeText={(text) => onChange({ targetRepsMax: parse(text) })} />
  </View><View style={styles.row}>
    <AppInput containerStyle={styles.input} label="Weight (optional)" keyboardType="decimal-pad" value={numberValue(value.targetWeight)} onChangeText={(text) => onChange({ targetWeight: parse(text) })} />
    <AppInput containerStyle={styles.input} label="Rest seconds" keyboardType="number-pad" value={numberValue(value.restSeconds)} onChangeText={(text) => onChange({ restSeconds: parse(text) })} />
  </View><AppInput label="Notes (optional)" value={value.notes ?? ''} onChangeText={(text) => onChange({ notes: text || null })} /></View>;
}
const styles = StyleSheet.create({ wrap: { gap: spacing.md }, label: { ...typography.label, color: colors.text }, row: { flexDirection: 'row', gap: spacing.sm }, input: { flex: 1 } });
