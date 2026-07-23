import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { FilterChip } from '@/components/FilterChip';
import { WorkoutTypeBadge } from '@/components/WorkoutTypeBadge';
import { colors } from '@/constants/colors';
import { dayparts, daypartLabels, type Daypart } from '@/constants/scheduledWorkout';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useDatabase } from '@/hooks/useDatabase';
import { getProgramById } from '@/repositories/programRepository';
import { cancelProgramSchedule, deleteScheduledWorkout, getScheduledWorkoutById, updateScheduledWorkout } from '@/repositories/scheduledWorkoutRepository';
import { isoToScheduledDateDisplay, maskScheduledDateInput, scheduledDateDisplayToIso } from '@/services/scheduledWorkoutService';
import type { ScheduledWorkout } from '@/types/scheduledWorkout';
import { getUserMessage } from '@/utils/errors';

/** "Only This Workout" is the only edit scope that exists yet (DECISIONS.md #47) — there is nothing to choose, so no scope sheet is shown. */
export default function ScheduledWorkoutDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDatabase();
  const [item, setItem] = useState<ScheduledWorkout | null>();
  const [programName, setProgramName] = useState<string | null>(null);
  const [dateText, setDateText] = useState('');
  const [daypart, setDaypart] = useState<Daypart | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const found = await getScheduledWorkoutById(db, id);
    setItem(found);
    if (found) { setDateText(isoToScheduledDateDisplay(`${found.scheduledDate}T00:00:00`)); setDaypart(found.daypart); setNotes(found.notes ?? ''); }
    if (found?.programId) { const program = await getProgramById(db, found.programId); setProgramName(program?.name ?? null); } else setProgramName(null);
  }, [db, id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const save = async () => {
    if (!item) return;
    try {
      const scheduledDate = scheduledDateDisplayToIso(dateText);
      setBusy(true); setError(undefined);
      await updateScheduledWorkout(db, item.id, { scheduledDate, daypart, notes: notes.trim() || null });
      router.back();
    } catch (caught) { setError(getUserMessage(caught, 'Check the date and try again.')); }
    finally { setBusy(false); }
  };
  const remove = () => Alert.alert('Remove from calendar?', item?.snapshotName, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: () => void (async () => { if (!item) return; setBusy(true); try { await deleteScheduledWorkout(db, item.id); router.back(); } catch (caught) { Alert.alert('Could not remove this item', getUserMessage(caught)); } finally { setBusy(false); } })() },
  ]);
  const cancelProgram = () => {
    const scheduledItem = item;
    if (!scheduledItem?.programId) return;
    const programId = scheduledItem.programId;
    Alert.alert(
      'Cancel remaining program workouts?',
      `All remaining workouts from this scheduled run of ${programName ?? 'the program'} will be removed from your calendar. Completed workouts and a workout currently in progress will be kept.`,
    [
      { text: 'Keep Program', style: 'cancel' },
      {
        text: 'Cancel Remaining',
        style: 'destructive',
        onPress: () => void (async () => {
          setBusy(true);
          try {
            const result = await cancelProgramSchedule(db, programId, scheduledItem.createdAt);
            Alert.alert(
              'Program cancelled',
              `${result.cancelledCount} remaining workout${result.cancelledCount === 1 ? '' : 's'} removed from the calendar.`,
              [{ text: 'View Calendar', onPress: () => router.replace('/calendar') }],
            );
          } catch (caught) {
            Alert.alert('Could not cancel program', getUserMessage(caught));
          } finally {
            setBusy(false);
          }
        })(),
      },
      ],
    );
  };

  if (item === undefined) return <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  if (!item) return <View style={styles.center}><Text style={styles.muted}>Scheduled workout not found.</Text></View>;

  return <View style={styles.screen}>
    <View style={styles.content}>
      <View style={styles.head}>
        <Text style={styles.title}>{item.snapshotName}</Text>
        <WorkoutTypeBadge type={item.snapshotWorkoutType} />
      </View>
      {programName ? <Text style={styles.programLabel}>{programName}{item.programWeekNumber ? ` · Week ${item.programWeekNumber}` : ''}</Text> : null}
      {!item.planId ? <Text style={styles.muted}>The linked workout is no longer available, but this calendar entry is unaffected.</Text> : null}
      <AppInput label="Date" placeholder="MM/DD/YYYY" keyboardType="number-pad" maxLength={10}
        value={dateText} onChangeText={(value) => setDateText(maskScheduledDateInput(value, dateText))} error={error} />
      <Text style={styles.label}>Daypart</Text>
      <View style={styles.row}>
        {dayparts.map((option) => <FilterChip key={option} label={daypartLabels[option]} selected={daypart === option} onPress={() => setDaypart(daypart === option ? null : option)} />)}
      </View>
      <AppInput label="Notes" multiline value={notes} onChangeText={setNotes} />
      {item.planId ? <AppButton label="View Workout" variant="secondary" onPress={() => router.push({ pathname: '/plans/[id]', params: { id: item.planId as string } })} /> : null}
      <AppButton label="Preview and Start" onPress={() => router.push({ pathname: '/start/preview', params: { scheduledId: item.id } })} />
      <AppButton label="Save Changes" loading={busy} onPress={() => void save()} />
      {item.programId ? <AppButton label="Cancel Remaining Program Workouts" variant="danger" disabled={busy} onPress={cancelProgram} /> : null}
      <AppButton label="Remove from Calendar" variant="danger" onPress={remove} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  muted: { ...typography.body, color: colors.textMuted },
  content: { padding: spacing.lg, gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { ...typography.title, color: colors.text, flex: 1 },
  programLabel: { ...typography.label, color: colors.accent },
  label: { ...typography.label, color: colors.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
