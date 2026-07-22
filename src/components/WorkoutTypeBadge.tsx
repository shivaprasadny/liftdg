import { StyleSheet, Text, View } from 'react-native';

import { workoutPlanTypeLabels, type WorkoutPlanType } from '@/constants/workoutPlanTypes';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

export function WorkoutTypeBadge({ type }: { type: WorkoutPlanType }) {
  return <View style={styles.badge}><Text style={styles.text}>{workoutPlanTypeLabels[type]}</Text></View>;
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.pill,
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  text: { ...typography.caption, color: colors.accent, fontWeight: '700' },
});
