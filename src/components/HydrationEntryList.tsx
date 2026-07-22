import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppColors } from '@/hooks/useAppColors';
import { formatServingAmount } from '@/services/hydrationService';
import type { WaterEntry } from '@/types/hydration';
import type { WaterUnit } from '@/types/settings';

interface Group { key: string; label: string; entries: WaterEntry[] }

interface Props {
  groups: Group[]; unit: WaterUnit;
  onEdit: (entry: WaterEntry) => void; onDelete: (entry: WaterEntry) => void;
}

export function HydrationEntryList({ groups, unit, onEdit, onDelete }: Props) {
  const colors = useAppColors();
  const isEmpty = groups.every((group) => group.entries.length === 0);
  if (isEmpty) return <EmptyState title="No entries" message="No hydration entries are recorded for this period." />;

  return (
    <View style={styles.container}>
      {groups.map((group) => (
        <View key={group.key} style={styles.group}>
          {group.label ? <Text style={[styles.groupLabel, { color: colors.textMuted }]}>{group.label}</Text> : null}
          {group.entries.map((entry) => (
            <View key={entry.id} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.content}>
                <Text style={[styles.amount, { color: colors.text }]}>{formatServingAmount(entry.amountMl, unit)}</Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {format(new Date(entry.loggedAt), 'MMM d, h:mm a')} · {entry.source.replace('_', ' ')}
                </Text>
                {entry.notes ? <Text style={[styles.notes, { color: colors.textMuted }]}>{entry.notes}</Text> : null}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Edit this entry" onPress={() => onEdit(entry)} hitSlop={8} style={styles.iconButton}>
                <Ionicons name="create-outline" size={20} color={colors.textMuted} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Delete this entry" onPress={() => onDelete(entry)} hitSlop={8} style={styles.iconButton}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  group: { gap: spacing.sm },
  groupLabel: { ...typography.label, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  content: { flex: 1, gap: 2 },
  amount: { ...typography.body, fontWeight: '700' },
  meta: { ...typography.caption },
  notes: { ...typography.caption, fontStyle: 'italic' },
  iconButton: { padding: spacing.xs },
});
