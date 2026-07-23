import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ProgramBuilderForm, type DraftDay, type ProgramBuilderInitial } from '@/components/ProgramBuilderForm';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import { useDatabase } from '@/hooks/useDatabase';
import { getProgramById, updateProgram } from '@/repositories/programRepository';
import { createId } from '@/utils/ids';

/** program_days rows are ordered by display_order, so rows sharing a day_number (multiple workouts on one day) are already adjacent. */
function groupDays(days: { dayNumber: number; dayLabel: string | null; plan: unknown }[]): DraftDay[] {
  const byDayNumber = new Map<number, DraftDay>();
  const order: number[] = [];
  for (const day of days) {
    let group = byDayNumber.get(day.dayNumber);
    if (!group) { group = { dayNumber: day.dayNumber, entries: [] }; byDayNumber.set(day.dayNumber, group); order.push(day.dayNumber); }
    group.entries.push({ id: createId('entry'), label: day.dayLabel ?? `Day ${day.dayNumber}`, plan: day.plan as DraftDay['entries'][number]['plan'] });
  }
  return order.map((dayNumber) => byDayNumber.get(dayNumber)!);
}

export default function EditProgramScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDatabase();
  const [initial, setInitial] = useState<ProgramBuilderInitial | null>();

  useEffect(() => {
    if (!id) return;
    void getProgramById(db, id).then((program) => {
      if (!program || program.isBuiltin) { setInitial(null); return; }
      setInitial({
        name: program.name,
        description: program.description ?? '',
        difficulty: program.difficulty,
        weekDays: program.weeks.map((week) => groupDays(week.days)),
      });
    });
  }, [db, id]);

  if (initial === undefined) return <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  if (initial === null) return <View style={styles.center}><Text style={styles.muted}>This program can&apos;t be edited.</Text></View>;

  return <ProgramBuilderForm initial={initial} submitLabel="Save Changes" submittingLabel="Saving…" errorTitle="Could not save program"
    onSubmit={async (input) => {
      await updateProgram(db, id, input);
      router.replace({ pathname: '/programs/[id]', params: { id } });
    }} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  muted: { ...typography.body, color: colors.textMuted },
});
