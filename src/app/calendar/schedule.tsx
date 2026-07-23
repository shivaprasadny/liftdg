import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { EmptyState } from '@/components/EmptyState';
import { FilterChip } from '@/components/FilterChip';
import { SearchBar } from '@/components/SearchBar';
import { WorkoutTypeBadge } from '@/components/WorkoutTypeBadge';
import { colors } from '@/constants/colors';
import { dayparts, daypartLabels, type Daypart } from '@/constants/scheduledWorkout';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useDatabase } from '@/hooks/useDatabase';
import { usePlanDraft } from '@/contexts/PlanDraftContext';
import { getBuiltInPlans, getUserPlans } from '@/repositories/workoutPlanRepository';
import { scheduleWorkout } from '@/repositories/scheduledWorkoutRepository';
import { isoToScheduledDateDisplay, maskScheduledDateInput, scheduledDateDisplayToIso } from '@/services/scheduledWorkoutService';
import type { WorkoutPlan } from '@/types/workoutPlan';
import { getUserMessage } from '@/utils/errors';

/** Step 1: pick a plan. Step 2 (date/daypart/notes) shows once a plan is selected. One-time scheduling only (DECISIONS.md #46). */
export default function ScheduleWorkoutScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const db = useDatabase();
  const { reset: resetPlanDraft } = usePlanDraft();
  const [search, setSearch] = useState('');
  const [plans, setPlans] = useState<WorkoutPlan[]>();
  const [selected, setSelected] = useState<WorkoutPlan | null>(null);
  const [dateText, setDateText] = useState(() => isoToScheduledDateDisplay(date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString()));
  const [daypart, setDaypart] = useState<Daypart | null>(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => { const timer = setTimeout(() => void Promise.all([getUserPlans(db, search), getBuiltInPlans(db, search)]).then(([mine, built]) => setPlans([...mine, ...built])), 150); return () => clearTimeout(timer); }, [db, search]);

  const save = async () => {
    if (!selected) return;
    try {
      const scheduledDate = scheduledDateDisplayToIso(dateText);
      setSaving(true); setError(undefined);
      await scheduleWorkout(db, { planId: selected.id, scheduledDate, daypart, startTime: null, notes: notes.trim() || null });
      router.back();
    } catch (caught) { setError(getUserMessage(caught, 'Check the date and try again.')); }
    finally { setSaving(false); }
  };

  const createWorkout = () => {
    resetPlanDraft();
    const scheduleDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);
    router.push({ pathname: '/plans/create', params: { scheduleDate } });
  };
  const createAction = <Pressable accessibilityRole="button" accessibilityLabel="Create custom workout" onPress={createWorkout} style={styles.createButton}><Ionicons name="add" size={27} color={colors.accentText} /></Pressable>;

  if (!selected) {
    return <View style={styles.screen}>
      <Stack.Screen options={{ headerRight: () => createAction }} />
      <View style={styles.searchWrap}><SearchBar value={search} onChangeText={setSearch} placeholder="Search your workouts…" /></View>
      {plans === undefined ? <ActivityIndicator style={styles.loader} size="large" color={colors.accent} />
        : <FlatList data={plans} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState title="No workouts found" message="Try a different search." />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => <Pressable onPress={() => setSelected(item)} style={styles.planRow}>
            <Text style={styles.planName}>{item.name}</Text>
            <WorkoutTypeBadge type={item.workoutType} />
          </Pressable>} />}
    </View>;
  }

  return <View style={styles.screen}>
    <Stack.Screen options={{ headerRight: () => createAction }} />
    <View style={styles.content}>
      <Text style={styles.label}>Scheduling</Text>
      <Text style={styles.selectedName}>{selected.name}</Text>
      <Pressable onPress={() => setSelected(null)}><Text style={styles.change}>Change workout</Text></Pressable>
      <AppInput label="Date" placeholder="MM/DD/YYYY" keyboardType="number-pad" maxLength={10}
        value={dateText} onChangeText={(value) => setDateText(maskScheduledDateInput(value, dateText))} error={error} />
      <Text style={styles.label}>Daypart (optional)</Text>
      <View style={styles.row}>
        {dayparts.map((item) => <FilterChip key={item} label={daypartLabels[item]} selected={daypart === item} onPress={() => setDaypart(daypart === item ? null : item)} />)}
      </View>
      <AppInput label="Notes (optional)" multiline value={notes} onChangeText={setNotes} />
      <AppButton label="Schedule Workout" loading={saving} onPress={() => void save()} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  searchWrap: { padding: spacing.lg },
  loader: { flex: 1 },
  list: { padding: spacing.lg, paddingTop: 0, flexGrow: 1 },
  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  planName: { ...typography.body, color: colors.text, fontWeight: '700', flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  label: { ...typography.label, color: colors.text },
  selectedName: { ...typography.title, color: colors.text },
  change: { ...typography.label, color: colors.accent },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  createButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
});
