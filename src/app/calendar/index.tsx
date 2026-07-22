import { addDays, format, parseISO } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { EmptyState } from '@/components/EmptyState';
import { WorkoutTypeBadge } from '@/components/WorkoutTypeBadge';
import { colors } from '@/constants/colors';
import { daypartLabels } from '@/constants/scheduledWorkout';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useDatabase } from '@/hooks/useDatabase';
import { getScheduledWorkoutsInRange } from '@/repositories/scheduledWorkoutRepository';
import { groupScheduledWorkoutsByDate } from '@/services/scheduledWorkoutService';
import type { ScheduledWorkout } from '@/types/scheduledWorkout';

const AGENDA_WINDOW_DAYS = 90;

/**
 * Agenda-only for now (DECISIONS.md #46) — a flat chronological list of one-time scheduled workouts,
 * grouped by day. No Month/Week views, no program population, no drag-and-drop yet.
 */
export default function CalendarScreen() {
  const db = useDatabase();
  const [items, setItems] = useState<ScheduledWorkout[]>();

  const load = useCallback(() => {
    const from = format(new Date(), 'yyyy-MM-dd');
    const to = format(addDays(new Date(), AGENDA_WINDOW_DAYS), 'yyyy-MM-dd');
    void getScheduledWorkoutsInRange(db, from, to).then(setItems);
  }, [db]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sections = groupScheduledWorkoutsByDate(items ?? []);

  return <View style={styles.screen}>
    <View style={styles.header}>
      <AppButton label="Schedule Workout" onPress={() => router.push('/calendar/schedule')} />
    </View>
    {items === undefined ? <ActivityIndicator style={styles.loader} size="large" color={colors.accent} />
      : sections.length === 0 ? <EmptyState title="Nothing scheduled" message="Schedule a workout to see it here." />
      : <ScrollView contentContainerStyle={styles.content}>
        {sections.map((section) => <View key={section.date} style={styles.day}>
          <Text style={styles.dayTitle}>{format(parseISO(section.date), 'EEEE, MMM d')}</Text>
          {section.items.map((item) => <Pressable key={item.id} onPress={() => router.push({ pathname: '/calendar/[id]', params: { id: item.id } })} style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.name} numberOfLines={1}>{item.snapshotName}</Text>
              <WorkoutTypeBadge type={item.snapshotWorkoutType} />
            </View>
            {item.programId ? <Text style={styles.programLabel}>{item.programWeekNumber ? `Program · Week ${item.programWeekNumber}` : 'Program'}</Text> : null}
            <Text style={styles.meta}>{item.startTime ?? (item.daypart ? daypartLabels[item.daypart] : 'Anytime')}{!item.planId ? ' · Workout no longer available' : ''}</Text>
            {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
          </Pressable>)}
        </View>)}
      </ScrollView>}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: 0 },
  loader: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  day: { gap: spacing.sm },
  dayTitle: { ...typography.heading, color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.xs },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  name: { ...typography.body, color: colors.text, fontWeight: '700', flex: 1 },
  programLabel: { ...typography.label, color: colors.accent },
  meta: { ...typography.caption, color: colors.textMuted },
  notes: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
});
