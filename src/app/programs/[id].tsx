import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { WorkoutTypeBadge } from '@/components/WorkoutTypeBadge';
import { colors } from '@/constants/colors';
import { programDifficultyLabels } from '@/constants/programDifficulty';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useDatabase } from '@/hooks/useDatabase';
import { getProgramById } from '@/repositories/programRepository';
import { formatProgramLength } from '@/services/programService';
import type { ProgramDay, ProgramTemplateWithWeeks } from '@/types/program';

/**
 * Read-only preview (DECISIONS.md #45), plus "Start Program" (DECISIONS.md #47) to populate the
 * calendar. No Preview-week/Edit/Duplicate actions yet. Tapping a day hands off to the existing
 * plan detail screen rather than duplicating that view here.
 */
export default function ProgramDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useDatabase();
  const [program, setProgram] = useState<ProgramTemplateWithWeeks | null>();
  const load = useCallback(() => { if (id) void getProgramById(db, id).then(setProgram); }, [db, id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (program === undefined) return <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  if (!program) return <View style={styles.center}><Text style={styles.muted}>Program not found.</Text></View>;

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
      </View>

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
});
