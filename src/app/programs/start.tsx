import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useDatabase } from '@/hooks/useDatabase';
import { getProgramById } from '@/repositories/programRepository';
import { startProgram } from '@/repositories/scheduledWorkoutRepository';
import { formatProgramLength } from '@/services/programService';
import { calculateProgramEndDate, isoToScheduledDateDisplay, maskScheduledDateInput, scheduledDateDisplayToIso } from '@/services/scheduledWorkoutService';
import type { ProgramTemplateWithWeeks } from '@/types/program';
import { getUserMessage } from '@/utils/errors';

/**
 * "Start Program" (DECISIONS.md #47): bulk-creates one scheduled_workouts row per non-rest program
 * day, starting from the chosen date. No preferred-weekday picker, no conflict detection, no
 * ActiveProgram record — this is a one-time population, not a resumable program lifecycle.
 */
export default function StartProgramScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDatabase();
  const [program, setProgram] = useState<ProgramTemplateWithWeeks | null>();
  const [dateText, setDateText] = useState(() => isoToScheduledDateDisplay(new Date().toISOString()));
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useFocusEffect(useCallback(() => { if (id) void getProgramById(db, id).then(setProgram); }, [db, id]));

  const confirm = async () => {
    if (!program) return;
    try {
      const startDate = scheduledDateDisplayToIso(dateText);
      setSaving(true); setError(undefined);
      const count = await startProgram(db, program.id, startDate);
      Alert.alert('Program started', `${count} workout${count === 1 ? '' : 's'} added to your calendar.`, [
        { text: 'View Calendar', onPress: () => router.replace('/calendar') },
      ]);
    } catch (caught) { setError(getUserMessage(caught, 'Check the date and try again.')); }
    finally { setSaving(false); }
  };

  if (program === undefined) return <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  if (!program) return <View style={styles.center}><Text style={styles.muted}>Program not found.</Text></View>;

  let endDatePreview: string | null = null;
  try { endDatePreview = isoToScheduledDateDisplay(`${calculateProgramEndDate(scheduledDateDisplayToIso(dateText), program.durationWeeks)}T00:00:00`); } catch { endDatePreview = null; }

  return <View style={styles.screen}>
    <View style={styles.content}>
      <Text style={styles.title}>{program.name}</Text>
      <Text style={styles.muted}>{formatProgramLength(program)}</Text>
      <AppInput label="Start date" placeholder="MM/DD/YYYY" keyboardType="number-pad" maxLength={10}
        value={dateText} onChangeText={(value) => setDateText(maskScheduledDateInput(value, dateText))} error={error} />
      {endDatePreview ? <Text style={styles.muted}>Ends: {endDatePreview}</Text> : null}
      <Text style={styles.notice}>This adds every workout day from the program to your calendar, starting on this date. Rest days are not added. This does not track an active/paused program — it&rsquo;s a one-time schedule fill.</Text>
      <AppButton label="Start Program" loading={saving} onPress={() => void confirm()} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  muted: { ...typography.body, color: colors.textMuted },
  content: { padding: spacing.lg, gap: spacing.md },
  title: { ...typography.title, color: colors.text },
  notice: { ...typography.caption, color: colors.textMuted },
});
