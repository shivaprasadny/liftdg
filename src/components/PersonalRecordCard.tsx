import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import type { PersonalRecordType, PersonalRecordWithDelta } from '@/types/personalRecord';
import { useSettings } from '@/contexts/SettingsContext';
import { kilogramsToDisplay } from '@/utils/units';
import type { WeightUnit } from '@/types/settings';

export const personalRecordTypeLabels: Record<PersonalRecordType, string> = {
  max_weight: 'Max Weight', max_reps: 'Max Reps', best_set_volume: 'Best Set Volume',
  estimated_one_rep_max: 'Est. One-Rep Max', best_workout_volume: 'Best Workout Volume',
};

export function formatRecordValue(record: Pick<PersonalRecordWithDelta, 'recordType' | 'value' | 'secondaryValue'>,unit:WeightUnit='kg'): string {
  if (record.recordType === 'max_reps') {
    return record.secondaryValue !== null ? `${record.value} reps @ ${kilogramsToDisplay(record.secondaryValue,unit).toFixed(1)} ${unit}` : `${record.value} reps`;
  }
  return `${kilogramsToDisplay(record.value,unit).toFixed(1)} ${unit}`;
}

interface Props { record: PersonalRecordWithDelta; onPress?: () => void; }

export function PersonalRecordCard({ record, onPress }: Props) {
  const {settings}=useSettings();
  const delta = record.previousValue !== null ? record.value - record.previousValue : null;
  return (
    <Pressable disabled={!onPress} onPress={onPress} accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.card, pressed && onPress && styles.pressed]}>
      <View style={styles.iconWrap}><Ionicons name="trophy" size={20} color={colors.accent} /></View>
      <View style={styles.content}>
        <Text style={styles.exercise}>{record.exerciseName}</Text>
        <Text style={styles.type}>{personalRecordTypeLabels[record.recordType]}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.value}>{formatRecordValue(record,settings.weightUnit)}</Text>
          <Text style={styles.date}>{format(new Date(record.achievedAt), 'MMM d, yyyy')}</Text>
        </View>
        {delta !== null && delta > 0 && (
          <Text style={styles.delta}>+{delta.toFixed(1)} {record.recordType === 'max_reps' ? 'reps' : 'kg'} vs. previous best</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: 0.75 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#143622', alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, gap: 2 },
  exercise: { ...typography.body, fontWeight: '700', color: colors.text },
  type: { ...typography.caption, color: colors.textMuted },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 2 },
  value: { ...typography.label, color: colors.text },
  date: { ...typography.caption, color: colors.textMuted },
  delta: { ...typography.caption, color: colors.accent, marginTop: 2 },
});
