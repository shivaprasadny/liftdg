import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FilterChip } from '@/components/FilterChip';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { workoutPlanTypeLabels, workoutPlanTypes, type WorkoutPlanType } from '@/constants/workoutPlanTypes';

/** Every type is selectable now so plans can be tagged correctly as soon as they're created, even
 * though only 'strength' has a dedicated exercise editor today — the rest are foundation-only tags
 * until their type-specific block editors are built. */
export function WorkoutTypePicker({ value, onChange }: { value: WorkoutPlanType; onChange: (value: WorkoutPlanType) => void }) {
  return <View style={styles.wrap}>
    <Text style={styles.label}>Workout type</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {workoutPlanTypes.map((type) => <FilterChip key={type} label={workoutPlanTypeLabels[type]} selected={value === type} onPress={() => onChange(type)} />)}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm }, label: { ...typography.label, color: colors.text }, row: { gap: spacing.sm },
});
