import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import type { WorkoutHistoryItem } from '@/types/workout';
import { useSettings } from '@/contexts/SettingsContext';
import { formatDistance, formatWeight } from '@/utils/units';

const duration = (seconds: number) => `${Math.floor(seconds / 60)} min`;
export function WorkoutHistoryCard({ workout, onPress }: { workout: WorkoutHistoryItem; onPress: () => void }) {
  const { settings } = useSettings();
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
    <View style={styles.head}><View style={styles.flex}><Text style={styles.name}>{workout.name}</Text><Text style={styles.meta}>{format(new Date(workout.startedAt), 'MMM d · h:mm a')} · {duration(workout.durationSeconds)} · {workout.workoutType}</Text></View>{workout.notes ? <Ionicons name="document-text-outline" color={colors.textMuted} size={18} /> : null}</View>
    {workout.planName ? <Text style={styles.plan}>Plan: {workout.planName}</Text> : null}
    <Text style={styles.stats}>{workout.exerciseCount} exercises · {workout.completedSetCount} sets · {workout.totalRepetitions} reps · {formatWeight(workout.totalVolume,settings.weightUnit)} volume{workout.cardioDurationSeconds?` · ${Math.round(workout.cardioDurationSeconds/60)} min cardio · ${formatDistance(workout.cardioDistanceKm,settings.distanceUnit)}`:''}</Text>
  </Pressable>;
}
const styles = StyleSheet.create({ card: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.sm }, pressed: { opacity: 0.75 }, head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, flex: { flex: 1 }, name: { ...typography.heading, color: colors.text }, meta: { ...typography.caption, color: colors.textMuted }, plan: { ...typography.caption, color: colors.accent }, stats: { ...typography.body, color: colors.text } });
