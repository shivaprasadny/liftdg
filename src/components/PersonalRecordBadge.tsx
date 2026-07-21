import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import type { PersonalRecord } from '@/types/personalRecord';

/**
 * Renders nothing when `records` is empty. Callers must pass only records the database has
 * actually confirmed (e.g. via personalRecordRepository after a workout completes) — this
 * component never infers or guesses a record on its own.
 */
export function PersonalRecordBadge({ records }: { records: PersonalRecord[] }) {
  if (records.length === 0) return null;
  const text = records.length === 1 ? 'New Personal Record' : `${records.length} New Personal Records`;
  return (
    <View style={styles.badge}>
      <Ionicons name="trophy" size={14} color={colors.accentText} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: colors.accent },
  text: { ...typography.caption, fontWeight: '700', color: colors.accentText },
});
