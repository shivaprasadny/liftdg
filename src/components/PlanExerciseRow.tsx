import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/colors'; import { radius, spacing } from '@/constants/spacing'; import { typography } from '@/constants/typography';
import type { DraftPlanExercise } from '@/contexts/PlanDraftContext'; import { formatPlanTarget } from '@/services/workoutPlanService';
import { PlanTargetEditor } from './PlanTargetEditor'; import { ReorderControls } from './ReorderControls';
export function PlanExerciseRow({ item, index, total, onChange, onRemove, onMove }: { item: DraftPlanExercise; index: number; total: number; onChange: (patch: Partial<DraftPlanExercise>) => void; onRemove: () => void; onMove: (direction: -1 | 1) => void }) {
  return <View style={styles.card}><View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel={`View exercise details for ${item.exercise.name}`} onPress={() => router.push({ pathname: '/exercises/[id]', params: { id: item.exerciseId } })} style={styles.title}><Text style={styles.order}>{index + 1}</Text><View><Text style={styles.name}>{item.exercise.name}</Text><Text style={styles.target}>{formatPlanTarget(item)}</Text></View></Pressable>
    <ReorderControls canUp={index > 0} canDown={index < total - 1} onUp={() => onMove(-1)} onDown={() => onMove(1)} /></View>
    <PlanTargetEditor value={item} onChange={onChange} /><Pressable accessibilityRole="button" onPress={onRemove}><Text style={styles.remove}>Remove exercise</Text></Pressable></View>;
}
const styles = StyleSheet.create({ card: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, title: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }, order: { width: 30, height: 30, textAlign: 'center', lineHeight: 30, borderRadius: 15, backgroundColor: colors.surfaceElevated, color: colors.accent, fontWeight: '800' }, name: { ...typography.body, color: colors.text, fontWeight: '700' }, target: { ...typography.caption, color: colors.textMuted }, remove: { ...typography.label, color: colors.danger } });
