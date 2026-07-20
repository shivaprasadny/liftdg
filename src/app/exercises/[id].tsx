import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { SectionHeader } from '@/components/SectionHeader';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useDatabase } from '@/hooks/useDatabase';
import { archiveExercise, getExerciseById, getExercisePerformance } from '@/repositories/exerciseRepository';
import type { Exercise, ExercisePerformance } from '@/types/exercise';
import { getUserMessage } from '@/utils/errors';

export default function ExerciseDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>(); const db = useDatabase();
  const [exercise, setExercise] = useState<Exercise | null>(); const [performance, setPerformance] = useState<ExercisePerformance>();
  const [error, setError] = useState<string>();
  useEffect(() => { void (async () => { try { if (!id) return; const [item, stats] = await Promise.all([getExerciseById(db, id), getExercisePerformance(db, id)]); setExercise(item); setPerformance(stats); }
    catch (caught) { setError(getUserMessage(caught, 'Could not load exercise details.')); } })(); }, [db, id]);
  if (exercise === undefined && !error) return <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  if (!exercise || error) return <AppScreen><View style={styles.center}><Text style={styles.error}>{error ?? 'Exercise not found.'}</Text></View></AppScreen>;
  const confirmArchive = () => Alert.alert('Archive exercise?', `${exercise.name} will be hidden from the library. Workout history will remain intact.`, [
    { text: 'Cancel', style: 'cancel' }, { text: 'Archive', style: 'destructive', onPress: async () => { await archiveExercise(db, exercise.id); router.back(); } },
  ]);
  return <AppScreen scroll style={styles.content}>
    <View style={styles.hero}><View style={styles.icon}><Ionicons name="barbell" size={34} color={colors.accent} /></View>
      <Text style={styles.title}>{exercise.name}</Text><Text style={styles.meta}>{exercise.category} · {exercise.equipment} · {exercise.exerciseType}</Text>
      <View style={styles.badges}>{exercise.primaryMuscles.map((muscle) => <Text style={styles.badge} key={muscle}>{muscle}</Text>)}</View></View>
    <SectionHeader>Instructions</SectionHeader>
    <View style={styles.card}>{exercise.instructions.length ? exercise.instructions.map((instruction, i) => <View key={instruction} style={styles.step}><Text style={styles.stepNumber}>{i + 1}</Text><Text style={styles.stepText}>{instruction}</Text></View>) : <Text style={styles.muted}>No instructions added.</Text>}</View>
    <SectionHeader>Performance</SectionHeader>
    <View style={styles.grid}><Stat label="Best weight" value={performance?.bestWeightKg != null ? `${performance.bestWeightKg.toFixed(1)} kg` : '—'} />
      <Stat label="Best set" value={performance?.bestSet ? `${performance.bestSet.weightKg} kg × ${performance.bestSet.reps}` : '—'} />
      <Stat label="Estimated 1RM" value={performance?.estimatedOneRepMaxKg != null ? `${performance.estimatedOneRepMaxKg.toFixed(1)} kg` : '—'} /></View>
    <SectionHeader>Recent workouts</SectionHeader>
    <View style={styles.card}>{performance?.recentWorkoutDates.length ? performance.recentWorkoutDates.map((date) => <Text style={styles.date} key={date}>{format(new Date(date), 'MMM d, yyyy')}</Text>) : <Text style={styles.muted}>Complete a workout with this exercise to see performance here.</Text>}</View>
    {!exercise.isBuiltin && <AppButton label="Archive Exercise" variant="danger" onPress={confirmArchive} />}
  </AppScreen>;
}
function Stat({ label, value }: { label: string; value: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
const styles = StyleSheet.create({ center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }, error: { ...typography.body, color: colors.danger }, content: { gap: spacing.lg, paddingTop: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.sm }, icon: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#143622', alignItems: 'center', justifyContent: 'center' }, title: { ...typography.title, color: colors.text, textAlign: 'center' }, meta: { ...typography.caption, color: colors.textMuted, textTransform: 'capitalize' }, badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, badge: { color: colors.accent, backgroundColor: '#143622', paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, fontWeight: '600' },
  card: { padding: spacing.lg, gap: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, step: { flexDirection: 'row', gap: spacing.md }, stepNumber: { color: colors.accent, fontWeight: '800' }, stepText: { ...typography.body, color: colors.text, flex: 1 }, muted: { ...typography.body, color: colors.textMuted },
  grid: { flexDirection: 'row', gap: spacing.sm }, stat: { flex: 1, minHeight: 92, borderRadius: radius.md, backgroundColor: colors.surface, padding: spacing.md, justifyContent: 'center' }, statValue: { ...typography.body, color: colors.text, fontWeight: '800' }, statLabel: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs }, date: { ...typography.body, color: colors.text } });
