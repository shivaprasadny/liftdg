import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ReorderControls } from './ReorderControls';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import type { ExerciseNavigationItem } from '@/types/exerciseNavigation';

interface Props { item: ExerciseNavigationItem; index: number; total: number; onFocus: () => void; onMoveUp: () => void; onMoveDown: () => void }

export const ActiveExerciseSummaryCard = memo(function ActiveExerciseSummaryCard({ item, index, total, onFocus, onMoveUp, onMoveDown }: Props) {
  const groupPrefix = item.group ? `${item.group.marker}${item.group.position + 1}` : String(index + 1);
  const status = item.completionStatus === 'complete' ? 'Completed' : `${item.completedSets} of ${item.totalSets} sets complete`;
  return <View style={[styles.card, item.completionStatus === 'complete' && styles.complete]}>
    {item.group ? <Text style={styles.group}>{item.group.label}</Text> : null}
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Focus ${item.name}, exercise ${index + 1} of ${total}`} onPress={onFocus} style={styles.focus}>
        <Text style={styles.title}>{groupPrefix}. {item.name}</Text>
        <Text style={styles.meta}>{item.category} · {item.exerciseType}</Text>
        <Text style={styles.status}>{item.completionStatus === 'complete' ? '✓ ' : ''}{status}</Text>
      </Pressable>
      <ReorderControls canUp={index > 0} canDown={index < total - 1} onUp={onMoveUp} onDown={onMoveDown} />
    </View>
  </View>;
});

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.sm, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  complete: { borderColor: colors.accent }, group: { ...typography.caption, color: colors.accent, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, focus: { flex: 1, minHeight: 52, justifyContent: 'center' },
  title: { ...typography.heading, color: colors.text }, meta: { ...typography.caption, color: colors.textMuted, textTransform: 'capitalize' },
  status: { ...typography.label, color: colors.text, marginTop: spacing.xs },
});
