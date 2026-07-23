import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActiveWorkoutBanner } from '@/components/ActiveWorkoutBanner';
import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { Header } from '@/components/Header';
import { SectionHeader } from '@/components/SectionHeader';
import { TodayWorkoutCard } from '@/components/TodayWorkoutCard';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useDatabase } from '@/hooks/useDatabase';
import { useStartWorkout } from '@/hooks/useStartWorkout';
import { getNextProgramWorkout, getScheduledWorkoutsForDate } from '@/repositories/scheduledWorkoutRepository';
import { createWorkoutFromCompletedWorkout, getActiveWorkout, getMostRecentCompletedWorkout } from '@/repositories/workoutRepository';
import { restoreScheduledAfterDiscard } from '@/repositories/workoutLaunchRepository';
import { localTodayKey, orderTodaysWorkouts } from '@/services/workoutLaunchService';
import type { ScheduledWorkout } from '@/types/scheduledWorkout';
import type { ActiveWorkout, WorkoutHistoryItem } from '@/types/workout';
import { getUserMessage } from '@/utils/errors';

export default function StartScreen() {
  const db = useDatabase();
  const launch = useStartWorkout(db);
  const [active, setActive] = useState<ActiveWorkout | null>();
  const [today, setToday] = useState<ScheduledWorkout[]>([]);
  const [next, setNext] = useState<ScheduledWorkout | null>(null);
  const [recent, setRecent] = useState<WorkoutHistoryItem | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const todayKey = localTodayKey();
      const [activeWorkout, todaysWorkouts, nextWorkout, recentWorkout] = await Promise.all([
        getActiveWorkout(db), getScheduledWorkoutsForDate(db, todayKey),
        getNextProgramWorkout(db, todayKey), getMostRecentCompletedWorkout(db),
      ]);
      setActive(activeWorkout);
      setToday(orderTodaysWorkouts(todaysWorkouts));
      setNext(nextWorkout);
      setRecent(recentWorkout);
    } catch (error) {
      Alert.alert('Could not load Start Workout', getUserMessage(error));
    } finally {
      setLoading(false);
    }
  }, [db]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const safelyStart = async (action: () => Promise<unknown>) => {
    if (active) {
      Alert.alert('Workout already in progress', 'Resume or finish your current workout before starting another.', [
        { text: 'Resume Workout', onPress: () => router.push({ pathname: '/workout/active', params: { id: active.id } }) },
        { text: 'Finish Workout', onPress: () => router.push({ pathname: '/workout/active', params: { id: active.id, finish: '1' } }) },
        { text: 'Discard and Start New', style: 'destructive', onPress: () => void restoreScheduledAfterDiscard(db, active.id, true).then(() => action()).catch((error) => Alert.alert('Could not start workout', getUserMessage(error))) },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    try { await action(); } catch (error) { Alert.alert('Could not start workout', getUserMessage(error)); }
  };

  const discard = () => active && Alert.alert('Discard workout?', 'Logged progress will be permanently removed.', [
    { text: 'Keep Workout', style: 'cancel' },
    { text: 'Discard and Keep Scheduled', onPress: () => void restoreScheduledAfterDiscard(db, active.id, true).then(load) },
    { text: 'Discard and Mark Skipped', style: 'destructive', onPress: () => void restoreScheduledAfterDiscard(db, active.id, false).then(load) },
  ]);

  if (loading && active === undefined) {
    return <AppScreen header={<Header title="Start Workout" />}><ActivityIndicator style={styles.loader} color={colors.accent} /></AppScreen>;
  }

  const eligible = today.filter((item) => ['scheduled', 'missed', 'skipped'].includes(item.status));
  const finishedToday = today.filter((item) => !eligible.includes(item));
  const quickHighlighted = !active && eligible.length === 0;

  return <AppScreen header={<Header title="Start Workout" />}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.intro}>
        <Text accessibilityRole="header" style={styles.question}>Ready to train?</Text>
        <Text style={styles.subtitle}>Choose today’s workout or jump into a quick session.</Text>
      </View>

      {active ? <View style={styles.section}>
        <Text style={styles.priorityLabel}>▶ WORKOUT IN PROGRESS</Text>
        <ActiveWorkoutBanner workout={active}
          onResume={() => router.push({ pathname: '/workout/active', params: { id: active.id } })}
          onEnd={() => router.push({ pathname: '/workout/active', params: { id: active.id, finish: '1' } })}
          onDiscard={discard} />
      </View> : null}

      <View style={styles.section}>
        <SectionHeader>📅 Today</SectionHeader>
        {eligible.length > 0 ? eligible.map((item) => <TodayWorkoutCard key={item.id} item={item}
          busy={launch.busyKey === `scheduled:${item.id}`}
          onStart={() => void safelyStart(() => launch.startScheduled(item.id))}
          onPreview={() => router.push({ pathname: '/start/preview', params: { scheduledId: item.id } })}
          onMove={() => router.push({ pathname: '/calendar/[id]', params: { id: item.id } })}
          onEdit={() => router.push({ pathname: '/calendar/[id]', params: { id: item.id } })} />)
          : <View style={styles.emptyToday}><Text style={styles.emptyEmoji}>🌿</Text><View style={styles.flex}><Text style={styles.cardTitle}>Nothing scheduled today</Text><Text style={styles.muted}>Rest if you need it, or choose a quick workout below.</Text></View></View>}
        <View style={styles.actionRow}>
          <AppButton label="Open Calendar" variant="secondary" onPress={() => router.push('/calendar')} style={styles.flex} />
          <AppButton label="Schedule" variant="secondary" onPress={() => router.push('/calendar/schedule')} style={styles.flex} />
        </View>
      </View>

      <View style={[styles.quickSection, quickHighlighted && styles.quickHighlighted]}>
        <View style={styles.quickHeading}>
          <View style={styles.flex}><Text style={[styles.quickEyebrow, quickHighlighted && styles.quickEyebrowHighlighted]}>{quickHighlighted ? 'BEST OPTION RIGHT NOW' : 'QUICK START'}</Text><Text style={styles.quickTitle}>⚡ Start immediately</Text><Text style={styles.muted}>No setup required. You can add exercises after starting.</Text></View>
        </View>
        <View style={styles.quickGrid}>
          <AppButton label="🏋️  Strength" variant={quickHighlighted ? 'primary' : 'secondary'} onPress={() => router.push({ pathname: '/start/quick', params: { type: 'strength' } })} style={styles.quickButton} />
          <AppButton label="🏃  Run" variant="secondary" onPress={() => router.push({ pathname: '/cardio/create', params: { activity: 'running', quick: '1' } })} style={styles.quickButton} />
          <AppButton label="🚴  Ride" variant="secondary" onPress={() => router.push({ pathname: '/cardio/create', params: { activity: 'cycling', quick: '1' } })} style={styles.quickButton} />
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader>📚 Choose a Saved Workout</SectionHeader>
        <Text style={styles.muted}>Browse your workouts or duplicate a LiftDG starter plan.</Text>
        <View style={styles.actionRow}>
          <AppButton label="My Workouts" variant="secondary" onPress={() => router.push({ pathname: '/(tabs)/plans', params: { view: 'mine' } })} style={styles.flex} />
          <AppButton label="Starter Plans" variant="secondary" onPress={() => router.push({ pathname: '/(tabs)/plans', params: { view: 'starters' } })} style={styles.flex} />
        </View>
      </View>

      {!active && next ? <View style={styles.section}>
        <SectionHeader>➡️ Next in Your Program</SectionHeader>
        <View style={styles.card}><Text style={styles.cardTitle}>{next.snapshotName}</Text><Text style={styles.muted}>Week {next.programWeekNumber ?? '—'} · scheduled {next.scheduledDate}</Text><View style={styles.actionRow}><AppButton label="Preview" variant="secondary" onPress={() => router.push({ pathname: '/start/preview', params: { scheduledId: next.id } })} style={styles.flex} /><AppButton label="Start Early" onPress={() => router.push({ pathname: '/start/preview', params: { scheduledId: next.id, early: '1' } })} style={styles.flex} /></View></View>
      </View> : null}

      {recent ? <View style={styles.section}>
        <SectionHeader>🔁 Recent Workout</SectionHeader>
        <View style={styles.card}><Text style={styles.cardTitle}>{recent.name}</Text><Text style={styles.muted}>{recent.exerciseCount} exercises · {recent.completedSetCount} completed sets</Text><AppButton label="Repeat Workout" variant="secondary" onPress={() => void safelyStart(async () => { const id = await createWorkoutFromCompletedWorkout(db, recent.id); router.push({ pathname: '/workout/active', params: { id } }); })} /></View>
      </View> : null}

      {finishedToday.length > 0 ? <View style={styles.todayStatus}><Text style={styles.statusTitle}>Today’s status</Text>{finishedToday.map((item) => <Text key={item.id} style={styles.muted}>{item.status.replaceAll('_', ' ')} · {item.snapshotName}</Text>)}</View> : null}
    </ScrollView>
  </AppScreen>;
}

const styles = StyleSheet.create({
  loader: { flex: 1 }, content: { paddingVertical: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl }, intro: { gap: spacing.xs },
  question: { ...typography.title, color: colors.text, fontSize: 29 }, subtitle: { ...typography.body, color: colors.textMuted },
  section: { gap: spacing.md }, priorityLabel: { ...typography.caption, color: colors.accent, fontWeight: '900', letterSpacing: 1.1 },
  emptyToday: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.md }, emptyEmoji: { fontSize: 30 },
  flex: { flex: 1 }, cardTitle: { ...typography.heading, color: colors.text }, muted: { ...typography.caption, color: colors.textMuted },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  quickSection: { padding: spacing.lg, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.lg },
  quickHighlighted: { borderColor: colors.accent, borderWidth: 2, backgroundColor: '#10291B' }, quickHeading: { flexDirection: 'row' },
  quickEyebrow: { ...typography.caption, color: colors.textMuted, fontWeight: '900', letterSpacing: 1.1 }, quickEyebrowHighlighted: { color: colors.accent },
  quickTitle: { ...typography.title, color: colors.text, fontSize: 24, marginTop: spacing.xs }, quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, quickButton: { width: '48%' },
  card: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  todayStatus: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, gap: spacing.xs }, statusTitle: { ...typography.label, color: colors.text },
});
