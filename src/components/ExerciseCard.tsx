import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import type { Exercise } from '@/types/exercise';

interface Props { exercise: Exercise; onPress: () => void; }

export const ExerciseCard = memo(function ExerciseCard({ exercise, onPress }: Props) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${exercise.name}`} onPress={onPress}
    style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
    <View style={styles.icon}><Ionicons name="barbell-outline" size={22} color={colors.accent} /></View>
    <View style={styles.content}>
      <View style={styles.titleRow}><Text style={styles.name}>{exercise.name}</Text>
        {!exercise.isBuiltin && <Text style={styles.custom}>CUSTOM</Text>}</View>
      <Text style={styles.meta}>{exercise.category} · {exercise.equipment}</Text>
      <Text numberOfLines={1} style={styles.muscles}>{exercise.primaryMuscles.join(', ')}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
  </Pressable>;
});

const styles = StyleSheet.create({
  card: { minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border }, pressed: { opacity: 0.72 },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#143622',
    alignItems: 'center', justifyContent: 'center' }, content: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.body, fontWeight: '700', color: colors.text, flexShrink: 1 },
  custom: { fontSize: 9, fontWeight: '800', color: colors.accent },
  meta: { ...typography.caption, color: colors.textMuted }, muscles: { fontSize: 12, color: colors.textMuted },
});
