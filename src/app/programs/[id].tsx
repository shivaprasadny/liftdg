import { format, parseISO } from 'date-fns';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { WorkoutTypeBadge } from '@/components/WorkoutTypeBadge';
import { colors } from '@/constants/colors';
import { programDifficultyLabels } from '@/constants/programDifficulty';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useDatabase } from '@/hooks/useDatabase';
import { deleteProgram, getProgramById } from '@/repositories/programRepository';
import { cancelProgramSchedule, getProgramScheduleBatches } from '@/repositories/scheduledWorkoutRepository';
import { formatProgramLength } from '@/services/programService';
import type { ProgramDay, ProgramTemplateWithWeeks } from '@/types/program';
import type { ProgramScheduleBatch } from '@/types/scheduledWorkout';
import { getUserMessage } from '@/utils/errors';

/**
 * Read-only preview (DECISIONS.md #45) for built-in programs, plus "Start Program" (DECISIONS.md #47)
 * to populate the calendar. User-created programs additionally get Edit/Delete actions (DECISIONS.md #55).
 * Tapping a day hands off to the existing plan detail screen rather than duplicating that view here.
 */
export default function ProgramDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDatabase();
  const [program, setProgram] = useState<ProgramTemplateWithWeeks | null>();
  const [scheduleBatches, setScheduleBatches] = useState<ProgramScheduleBatch[]>([]);
  const [cancellingBatch, setCancellingBatch] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const load = useCallback(() => {
    if (!id) return;
    void Promise.all([getProgramById(db, id), getProgramScheduleBatches(db, id)])
      .then(([nextProgram, batches]) => {
        setProgram(nextProgram);
        setScheduleBatches(batches);
      })
      .catch((error: unknown) => Alert.alert('Could not load program', getUserMessage(error)));
  }, [db, id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const requestCancellation = useCallback((batch: ProgramScheduleBatch) => {
    const preserved = batch.completedCount + batch.inProgressCount;
    const preservationMessage = preserved > 0
      ? ` ${preserved} completed or in-progress workout${preserved === 1 ? '' : 's'} will be preserved.`
      : '';
    Alert.alert(
      'Cancel this program schedule?',
      `This will cancel ${batch.eligibleCount} remaining workout${batch.eligibleCount === 1 ? '' : 's'} from the calendar.${preservationMessage}`,
      [
        { text: 'Keep Program', style: 'cancel' },
        {
          text: 'Cancel Remaining',
          style: 'destructive',
          onPress: () => {
            setCancellingBatch(batch.batchCreatedAt);
            void cancelProgramSchedule(db, batch.programId, batch.batchCreatedAt)
              .then((result) => {
                Alert.alert(
                  'Program schedule cancelled',
                  `${result.cancelledCount} remaining workout${result.cancelledCount === 1 ? '' : 's'} cancelled. Completed and in-progress workouts were kept.`,
                );
                load();
              })
              .catch((error: unknown) => Alert.alert('Could not cancel program', getUserMessage(error)))
              .finally(() => setCancellingBatch(null));
          },
        },
      ],
    );
  }, [db, load]);

  if (program === undefined) return <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  if (!program) return <View style={styles.center}><Text style={styles.muted}>Program not found.</Text></View>;

  const requestDelete = () => Alert.alert('Delete this program?', 'This permanently removes the program and its weeks. Scheduled and completed workouts already on your calendar are not affected.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: () => {
      setDeleting(true);
      void deleteProgram(db, program.id)
        .then(() => router.replace('/programs'))
        .catch((error: unknown) => { Alert.alert('Could not delete program', getUserMessage(error)); setDeleting(false); });
    } },
  ]);

  return <View style={styles.screen}>
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.title}>{program.name}</Text>
        <Text style={styles.badge}>{program.isBuiltin ? 'BUILT-IN PROGRAM' : 'MY PROGRAM'}</Text>
        {program.description ? <Text style={styles.description}>{program.description}</Text> : null}
        <Text style={styles.meta}>{formatProgramLength(program)} · {programDifficultyLabels[program.difficulty]}</Text>
        {program.goal ? <Text style={styles.meta}>Goal: {program.goal}</Text> : null}
        {program.equipmentLevel ? <Text style={styles.meta}>Equipment: {program.equipmentLevel}</Text> : null}
        {program.notes ? <Text style={styles.notes}>{program.notes}</Text> : null}
        <AppButton label="Start Program" onPress={() => router.push({ pathname: '/programs/start', params: { id: program.id } })} style={styles.startButton} />
        {!program.isBuiltin ? <View style={styles.ownerActions}>
          <AppButton label="Edit Program" variant="secondary" onPress={() => router.push({ pathname: '/programs/edit/[id]', params: { id: program.id } })} style={styles.flex} />
          <AppButton label={deleting ? 'Deleting…' : 'Delete Program'} variant="danger" loading={deleting} onPress={requestDelete} style={styles.flex} />
        </View> : null}
      </View>

      {scheduleBatches.length > 0 ? <View style={styles.scheduleSection}>
        <View style={styles.sectionHeading}>
          <View style={styles.sectionHeadingCopy}>
            <Text style={styles.sectionTitle}>Scheduled program runs</Text>
            <Text style={styles.sectionSubtitle}>Manage workouts added to your calendar.</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="View training calendar" onPress={() => router.push('/calendar')} style={styles.calendarLink}>
            <Text style={styles.calendarLinkText}>Calendar</Text>
          </Pressable>
        </View>
        {scheduleBatches.map((batch) => <View key={batch.batchCreatedAt} style={styles.scheduleCard}>
          <View style={styles.scheduleCardHeader}>
            <View style={styles.sectionHeadingCopy}>
              <Text style={styles.scheduleRange}>{format(parseISO(batch.startDate), 'MMM d, yyyy')} – {format(parseISO(batch.endDate), 'MMM d, yyyy')}</Text>
              <Text style={styles.scheduleMeta}>{batch.totalCount} workouts · {batch.completedCount} completed</Text>
            </View>
            <Text style={[styles.statusBadge, batch.eligibleCount === 0 && styles.statusBadgeMuted]}>
              {batch.eligibleCount > 0 ? `${batch.eligibleCount} remaining` : 'No remaining'}
            </Text>
          </View>
          {batch.inProgressCount > 0 ? <Text style={styles.activeNote}>{batch.inProgressCount} workout currently in progress and protected</Text> : null}
          {batch.cancelledCount > 0 ? <Text style={styles.cancelledNote}>{batch.cancelledCount} previously cancelled</Text> : null}
          {batch.eligibleCount > 0 ? <AppButton
            label={cancellingBatch === batch.batchCreatedAt ? 'Cancelling…' : 'Cancel Program Schedule'}
            variant="danger"
            loading={cancellingBatch === batch.batchCreatedAt}
            disabled={cancellingBatch !== null}
            onPress={() => requestCancellation(batch)}
          /> : null}
        </View>)}
      </View> : null}

      {program.weeks.map((week) => <View key={week.id} style={styles.weekCard}>
        <View style={styles.weekHead}>
          <Text style={styles.weekTitle}>{week.title ?? `Week ${week.weekNumber}`}</Text>
          {week.isDeload && <Text style={styles.tag}>DELOAD</Text>}
          {week.isAssessment && <Text style={styles.tag}>ASSESSMENT</Text>}
        </View>
        {week.focus ? <Text style={styles.weekFocus}>{week.focus}</Text> : null}
        {week.days.map((day) => <ProgramDayRow key={day.id} day={day} />)}
        {week.notes ? <Text style={styles.notes}>{week.notes}</Text> : null}
      </View>)}
    </ScrollView>
  </View>;
}

function ProgramDayRow({ day }: { day: ProgramDay }) {
  if (day.isRestDay) {
    return <View style={styles.dayRow}>
      <Text style={styles.dayLabel}>{day.dayLabel ?? `Day ${day.dayNumber}`}</Text>
      <Text style={styles.restText}>Rest day</Text>
    </View>;
  }
  return <Pressable disabled={!day.planId} onPress={() => day.planId && router.push({ pathname: '/plans/[id]', params: { id: day.planId } })} style={styles.dayRow}>
    <View style={styles.dayHead}>
      <Text style={styles.dayLabel}>{day.dayLabel ?? `Day ${day.dayNumber}`}</Text>
      {day.workoutType && <WorkoutTypeBadge type={day.workoutType} />}
      {day.isOptional && <Text style={styles.tag}>OPTIONAL</Text>}
    </View>
    {day.plan ? <Text style={styles.dayPlan}>{day.plan.name} · {day.plan.exerciseCount} exercises</Text>
      : day.planId ? <Text style={styles.restText}>Linked workout is no longer available.</Text> : null}
    {day.notes ? <Text style={styles.notes}>{day.notes}</Text> : null}
  </Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  muted: { ...typography.body, color: colors.textMuted },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  hero: { gap: spacing.xs, paddingBottom: spacing.sm },
  startButton: { marginTop: spacing.sm },
  ownerActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  flex: { flex: 1 },
  title: { ...typography.title, color: colors.text },
  badge: { fontSize: 11, color: colors.accent, fontWeight: '800' },
  description: { ...typography.body, color: colors.text },
  meta: { ...typography.caption, color: colors.textMuted },
  notes: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
  weekCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm },
  weekHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  weekTitle: { ...typography.heading, color: colors.text, flex: 1 },
  weekFocus: { ...typography.label, color: colors.accent },
  tag: { fontSize: 10, color: colors.warning, fontWeight: '800' },
  dayRow: { gap: 2, paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dayLabel: { ...typography.body, color: colors.text, fontWeight: '700', flex: 1 },
  dayPlan: { ...typography.caption, color: colors.textMuted },
  restText: { ...typography.caption, color: colors.textMuted },
  scheduleSection: { gap: spacing.sm },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionHeadingCopy: { flex: 1, gap: 2 },
  sectionTitle: { ...typography.heading, color: colors.text },
  sectionSubtitle: { ...typography.caption, color: colors.textMuted },
  calendarLink: { minHeight: 44, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  calendarLinkText: { ...typography.label, color: colors.accent },
  scheduleCard: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm },
  scheduleCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  scheduleRange: { ...typography.body, color: colors.text, fontWeight: '800' },
  scheduleMeta: { ...typography.caption, color: colors.textMuted },
  statusBadge: { fontSize: 10, color: colors.accent, backgroundColor: colors.surfaceElevated, fontWeight: '900', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, overflow: 'hidden' },
  statusBadgeMuted: { color: colors.textMuted, backgroundColor: colors.surfaceElevated },
  activeNote: { ...typography.caption, color: colors.warning },
  cancelledNote: { ...typography.caption, color: colors.textMuted },
});
