import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useDatabase } from '@/hooks/useDatabase';
import { applyReplacementsToPlan, getReplacedExerciseChanges } from '@/repositories/applyChangesRepository';
import { getWorkoutDetails } from '@/repositories/workoutRepository';
import type { ReplacedExerciseChange } from '@/types/applyChanges';
import type { WorkoutDetails } from '@/types/workout';
import { getUserMessage } from '@/utils/errors';

/**
 * Smallest slice of Apply Changes (DECISIONS.md #48): exercise-replacement changes only, applied to
 * the source Workout Template. No weight/rep/RPE proposals, no program scopes, no conflicts, no
 * audit trail, no revert — see the decision for what's deferred.
 */
export default function ApplyChangesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDatabase();
  const [workout, setWorkout] = useState<WorkoutDetails | null>();
  const [changes, setChanges] = useState<ReplacedExerciseChange[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const found = await getWorkoutDetails(db, id);
    setWorkout(found);
    setChanges(found ? await getReplacedExerciseChanges(db, found) : []);
  }, [db, id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const toggle = (workoutExerciseId: string) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(workoutExerciseId)) next.delete(workoutExerciseId); else next.add(workoutExerciseId);
    return next;
  });

  const apply = async () => {
    if (!workout?.planId) return;
    const chosen = changes.filter((change) => selected.has(change.workoutExerciseId));
    if (chosen.length === 0) { router.back(); return; }
    try {
      setBusy(true);
      const result = await applyReplacementsToPlan(db, workout.planId, chosen);
      const message = result.skipped.length
        ? `${result.appliedCount} change${result.appliedCount === 1 ? '' : 's'} applied. ${result.skipped.length} skipped (already in the workout template).`
        : `${result.appliedCount} change${result.appliedCount === 1 ? '' : 's'} applied to ${workout.planName ?? 'the workout template'}.`;
      Alert.alert('Changes applied', message, [{ text: 'Done', onPress: () => router.back() }]);
    } catch (error) { Alert.alert('Could not apply changes', getUserMessage(error)); }
    finally { setBusy(false); }
  };

  if (workout === undefined) return <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  if (!workout) return <View style={styles.center}><Text style={styles.muted}>Workout not found.</Text></View>;

  return <View style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Apply Changes</Text>
      <Text style={styles.muted}>From {workout.name}. Select any exercise swaps you want to keep in {workout.planName ?? 'this workout template'} going forward.</Text>
      {changes.length === 0 ? <Text style={styles.muted}>No reusable changes were detected.</Text> : changes.map((change) => {
        const isSelected = selected.has(change.workoutExerciseId);
        return <Pressable key={change.workoutExerciseId} accessibilityRole="checkbox" accessibilityState={{ checked: isSelected }}
          onPress={() => toggle(change.workoutExerciseId)} style={styles.row}>
          <Ionicons name={isSelected ? 'checkbox' : 'square-outline'} size={22} color={isSelected ? colors.accent : colors.textMuted} />
          <View style={styles.rowBody}>
            <Text style={styles.rowText}>Replace {change.originalExerciseName} with {change.replacementExerciseName}</Text>
            {change.reason ? <Text style={styles.muted}>{change.reason.replaceAll('_', ' ')}</Text> : null}
          </View>
        </Pressable>;
      })}
    </ScrollView>
    <View style={styles.footer}>
      {changes.length > 0 && <AppButton label="Update Workout Template" loading={busy} disabled={selected.size === 0} onPress={() => void apply()} />}
      <AppButton label="No Future Changes" variant="secondary" onPress={() => router.back()} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  muted: { ...typography.body, color: colors.textMuted },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.title, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  rowBody: { flex: 1, gap: 2 },
  rowText: { ...typography.body, color: colors.text, fontWeight: '700' },
  footer: { padding: spacing.lg, gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
});
