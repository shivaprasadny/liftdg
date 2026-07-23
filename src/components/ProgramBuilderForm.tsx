import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { FilterChip } from '@/components/FilterChip';
import { SearchBar } from '@/components/SearchBar';
import { WorkoutTypeBadge } from '@/components/WorkoutTypeBadge';
import { colors } from '@/constants/colors';
import { programDifficulties, programDifficultyLabels, type ProgramDifficulty } from '@/constants/programDifficulty';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { usePlanDraft } from '@/contexts/PlanDraftContext';
import { useDatabase } from '@/hooks/useDatabase';
import { duplicatePlan, getBuiltInPlans, getPlanById, getUserPlans } from '@/repositories/workoutPlanRepository';
import type { CreateProgramInput } from '@/types/program';
import type { WorkoutPlan, WorkoutPlanWithExercises } from '@/types/workoutPlan';
import { getUserMessage } from '@/utils/errors';
import { createId } from '@/utils/ids';

export interface DraftDayEntry { id: string; label: string; plan: WorkoutPlan | null }
export interface DraftDay { dayNumber: number; entries: DraftDayEntry[] }

export function makeDays(count: number): DraftDay[] {
  return Array.from({ length: count }, (_, index) => ({ dayNumber: index + 1, entries: [{ id: createId('entry'), label: `Day ${index + 1}`, plan: null }] }));
}

export interface ProgramBuilderInitial {
  name: string;
  description: string;
  difficulty: ProgramDifficulty;
  weekDays: DraftDay[][];
}

interface Props {
  initial?: ProgramBuilderInitial;
  submitLabel: string;
  submittingLabel: string;
  errorTitle: string;
  onSubmit: (input: CreateProgramInput) => Promise<void>;
}

export function ProgramBuilderForm({ initial, submitLabel, submittingLabel, errorTitle, onSubmit }: Props) {
  const db = useDatabase();
  const { reset: resetPlanDraft } = usePlanDraft();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [weeksText, setWeeksText] = useState(String(initial?.weekDays.length ?? 4));
  const [defaultDaysPerWeek, setDefaultDaysPerWeek] = useState(initial?.weekDays[0]?.length ?? 3);
  const [difficulty, setDifficulty] = useState<ProgramDifficulty>(initial?.difficulty ?? 'beginner');
  const [weekDays, setWeekDays] = useState<DraftDay[][]>(() => initial?.weekDays ?? Array.from({ length: 4 }, () => makeDays(3)));
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [plans, setPlans] = useState<WorkoutPlan[]>();
  const [pickerTarget, setPickerTarget] = useState<{ dayIndex: number; entryIndex: number } | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingNewWorkout, setPendingNewWorkout] = useState<{ dayIndex: number; entryIndex: number } | null>(null);
  const navigatedToCreateAt = useRef<number | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [planDetails, setPlanDetails] = useState<Record<string, WorkoutPlanWithExercises>>({});
  const [duplicating, setDuplicating] = useState(false);

  const loadPlans = useCallback(() => {
    void Promise.all([getUserPlans(db, ''), getBuiltInPlans(db, '')]).then(([mine, built]) => {
      const all = [...mine, ...built];
      setPlans(all);
      if (pendingNewWorkout !== null && navigatedToCreateAt.current !== null) {
        const since = navigatedToCreateAt.current;
        const created = all.filter((plan) => new Date(plan.createdAt).getTime() >= since);
        if (created.length === 1) {
          const [plan] = created;
          const { dayIndex, entryIndex } = pendingNewWorkout;
          setWeekDays((current) => current.map((week, weekIndex) => weekIndex !== selectedWeek ? week
            : week.map((day, dIndex) => dIndex !== dayIndex ? day : { ...day, entries: day.entries.map((entry, eIndex) => eIndex !== entryIndex ? entry
              : { ...entry, plan, label: entry.label.trim() === '' || entry.label === `Day ${day.dayNumber}` ? plan.name : entry.label }) })));
        }
        setPendingNewWorkout(null);
        navigatedToCreateAt.current = null;
      }
    });
  }, [db, pendingNewWorkout, selectedWeek]);
  useFocusEffect(useCallback(() => { loadPlans(); }, [loadPlans]));

  const filteredPlans = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? (plans ?? []).filter((plan) => `${plan.name} ${plan.description ?? ''}`.toLowerCase().includes(term)) : plans ?? [];
  }, [plans, search]);

  const togglePreview = (planId: string) => {
    if (expandedPlanId === planId) { setExpandedPlanId(null); return; }
    setExpandedPlanId(planId);
    if (!planDetails[planId]) void getPlanById(db, planId).then((full) => { if (full) setPlanDetails((current) => ({ ...current, [planId]: full })); });
  };

  const changeWeekCount = (text: string) => {
    setWeeksText(text);
    const count = Number(text);
    if (!Number.isInteger(count) || count < 1 || count > 52) return;
    setWeekDays((current) => Array.from({ length: count }, (_, index) => current[index] ?? makeDays(defaultDaysPerWeek)));
    setSelectedWeek((current) => Math.min(current, count - 1));
  };
  const addDayToSelectedWeek = () => setWeekDays((current) => current.map((week, weekIndex) => {
    if (weekIndex !== selectedWeek || week.length >= 7) return week;
    return [...week, { dayNumber: week.length + 1, entries: [{ id: createId('entry'), label: `Day ${week.length + 1}`, plan: null }] }];
  }));
  const removeDayFromSelectedWeek = () => {
    const week = weekDays[selectedWeek];
    if (week.length <= 1) return;
    const lastDay = week[week.length - 1];
    const hasAnyPlan = lastDay.entries.some((entry) => entry.plan);
    const run = () => setWeekDays((current) => current.map((item, weekIndex) => weekIndex !== selectedWeek ? item : item.slice(0, -1)));
    if (hasAnyPlan) Alert.alert(`Remove Day ${lastDay.dayNumber} from Week ${selectedWeek + 1}?`, `This removes all ${lastDay.entries.length > 1 ? `${lastDay.entries.length} workouts` : 'its workout'} for that day.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: run }]);
    else run();
  };
  const addEntryToDay = (dayIndex: number) => setWeekDays((current) => current.map((week, weekIndex) => weekIndex !== selectedWeek ? week
    : week.map((day, dIndex) => dIndex !== dayIndex ? day : { ...day, entries: [...day.entries, { id: createId('entry'), label: '', plan: null }] })));
  const removeEntryFromDay = (dayIndex: number, entryIndex: number) => {
    const day = weekDays[selectedWeek][dayIndex];
    if (day.entries.length <= 1) return;
    const entry = day.entries[entryIndex];
    const run = () => setWeekDays((current) => current.map((week, weekIndex) => weekIndex !== selectedWeek ? week
      : week.map((d, dIndex) => dIndex !== dayIndex ? d : { ...d, entries: d.entries.filter((_, eIndex) => eIndex !== entryIndex) })));
    if (entry.plan) Alert.alert(`Remove "${entry.label.trim() || entry.plan.name}"?`, undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: run }]);
    else run();
  };
  const choosePlan = (plan: WorkoutPlan) => {
    if (!pickerTarget) return;
    const { dayIndex, entryIndex } = pickerTarget;
    setWeekDays((current) => current.map((week, weekIndex) => weekIndex !== selectedWeek ? week
      : week.map((day, dIndex) => dIndex !== dayIndex ? day : { ...day, entries: day.entries.map((entry, eIndex) => eIndex !== entryIndex ? entry
        : { ...entry, plan, label: entry.label.trim() === '' || entry.label === `Day ${day.dayNumber}` ? plan.name : entry.label }) })));
    setPickerTarget(null);
    setSearch('');
  };
  const copyPreviousWeek = () => {
    const targetHasChoices = weekDays[selectedWeek].some((day) => day.entries.some((entry) => entry.plan));
    const run = () => setWeekDays((current) => current.map((days, weekIndex) => weekIndex !== selectedWeek ? days
      : current[selectedWeek - 1].map((day) => ({ ...day, entries: day.entries.map((entry) => ({ ...entry, id: createId('entry') })) }))));
    if (targetHasChoices) Alert.alert(`Copy Week ${selectedWeek} into Week ${selectedWeek + 1}?`, 'This replaces the workouts already chosen for this week.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Copy', onPress: run }]);
    else run();
  };
  const createWorkoutForPickerTarget = () => {
    if (!pickerTarget) return;
    setPendingNewWorkout(pickerTarget);
    navigatedToCreateAt.current = Date.now();
    setPickerTarget(null);
    setSearch('');
    resetPlanDraft();
    router.push('/plans/create');
  };
  const duplicateAndCustomize = async (plan: WorkoutPlan, target: { dayIndex: number; entryIndex: number }) => {
    setDuplicating(true);
    try {
      const copy = await duplicatePlan(db, plan.id);
      const { dayIndex, entryIndex } = target;
      setWeekDays((current) => current.map((week, weekIndex) => weekIndex !== selectedWeek ? week
        : week.map((day, dIndex) => dIndex !== dayIndex ? day : { ...day, entries: day.entries.map((entry, eIndex) => eIndex !== entryIndex ? entry
          : { ...entry, plan: copy, label: entry.label.trim() === '' || entry.label === `Day ${day.dayNumber}` ? copy.name : entry.label }) })));
      setPickerTarget(null);
      setExpandedPlanId(null);
      setSearch('');
      router.push({ pathname: '/plans/edit/[id]', params: { id: copy.id } });
    } catch (error) {
      Alert.alert('Could not duplicate this workout', getUserMessage(error));
    } finally {
      setDuplicating(false);
    }
  };
  const days = weekDays[selectedWeek] ?? [];
  const save = async () => {
    try {
      const durationWeeks = Number(weeksText);
      if (!Number.isInteger(durationWeeks) || durationWeeks < 1 || durationWeeks > 52) throw new Error('Program length must be between 1 and 52 weeks.');
      const missingWeek = weekDays.findIndex((week) => week.some((day) => day.entries.some((entry) => !entry.plan)));
      if (missingWeek !== -1) throw new Error(`Choose a workout for every training slot in Week ${missingWeek + 1}.`);
      setSaving(true);
      await onSubmit({
        name, description: description.trim() || null, difficulty, durationWeeks,
        weeks: weekDays.map((week, weekIndex) => ({
          weekNumber: weekIndex + 1,
          days: week.flatMap((day) => day.entries.map((entry) => ({ dayNumber: day.dayNumber, dayLabel: entry.label.trim() || `Day ${day.dayNumber}`,
            planId: entry.plan!.id, workoutType: entry.plan!.workoutType, estimatedDurationMinutes: null, notes: null }))),
        })),
      });
    } catch (error) {
      Alert.alert(errorTitle, getUserMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.intro}><Text style={styles.eyebrow}>CUSTOM PROGRAM</Text><Text style={styles.title}>Build your training schedule</Text><Text style={styles.muted}>Choose the workout for each day, one week at a time — every week can look different. Add more than one workout to a day (e.g. a Morning and an Evening session) and label each one. Use &ldquo;Copy Previous Week&rdquo; to reuse a week as a starting point.</Text></View>
      <View style={styles.card}>
        <Text style={styles.step}>1 · PROGRAM DETAILS</Text>
        <AppInput label="Program name" placeholder="My Strength Program" value={name} onChangeText={setName} />
        <AppInput label="Description (optional)" multiline value={description} onChangeText={setDescription} />
        <AppInput label="Number of weeks" keyboardType="number-pad" maxLength={2} value={weeksText} onChangeText={changeWeekCount} />
        <Text style={styles.label}>Difficulty</Text><View style={styles.chips}>{programDifficulties.map((value) => <FilterChip key={value} label={programDifficultyLabels[value]} selected={difficulty === value} onPress={() => setDifficulty(value)} />)}</View>
      </View>
      <View style={styles.card}>
        <Text style={styles.step}>2 · DEFAULT DAYS PER WEEK</Text>
        <Text style={styles.heading}>Starting day count for new weeks</Text>
        <Text style={styles.muted}>Each week can still have more or fewer training days than this — use the +/− controls in Step 3 to change a specific week.</Text>
        <View style={styles.dayCounts}>{[1, 2, 3, 4, 5, 6, 7].map((count) => <Pressable key={count} accessibilityRole="button" accessibilityState={{ selected: defaultDaysPerWeek === count }} onPress={() => setDefaultDaysPerWeek(count)} style={[styles.dayCount, defaultDaysPerWeek === count && styles.dayCountSelected]}><Text style={[styles.dayCountText, defaultDaysPerWeek === count && styles.dayCountTextSelected]}>{count}</Text></Pressable>)}</View>
      </View>
      <View style={styles.card}>
        <Text style={styles.step}>3 · WORKOUT FOR EACH WEEK</Text>
        <Text style={styles.heading}>Which week are you editing?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekChips}>
          {weekDays.map((week, index) => { const filled = week.reduce((sum, day) => sum + day.entries.filter((entry) => entry.plan).length, 0); const total = week.reduce((sum, day) => sum + day.entries.length, 0); return <Pressable key={index} accessibilityRole="button" accessibilityState={{ selected: selectedWeek === index }} onPress={() => setSelectedWeek(index)} style={[styles.weekChip, selectedWeek === index && styles.weekChipSelected]}>
            <Text style={[styles.weekChipText, selectedWeek === index && styles.weekChipTextSelected]}>Week {index + 1}</Text>
            <Text style={[styles.weekChipMeta, selectedWeek === index && styles.weekChipTextSelected]}>{filled}/{total} set</Text>
          </Pressable>; })}
        </ScrollView>
        {selectedWeek > 0 ? <AppButton label={`Copy Week ${selectedWeek}`} variant="secondary" onPress={copyPreviousWeek} /> : null}
        <View style={styles.dayStepper}>
          <Text style={styles.label}>Week {selectedWeek + 1} has {days.length} training day{days.length === 1 ? '' : 's'}</Text>
          <View style={styles.dayStepperButtons}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove a training day from Week ${selectedWeek + 1}`} disabled={days.length <= 1} onPress={removeDayFromSelectedWeek} style={[styles.stepperButton, days.length <= 1 && styles.stepperButtonDisabled]}><Ionicons name="remove" size={18} color={days.length <= 1 ? colors.textMuted : colors.accent} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Add a training day to Week ${selectedWeek + 1}`} disabled={days.length >= 7} onPress={addDayToSelectedWeek} style={[styles.stepperButton, days.length >= 7 && styles.stepperButtonDisabled]}><Ionicons name="add" size={18} color={days.length >= 7 ? colors.textMuted : colors.accent} /></Pressable>
          </View>
        </View>
        {days.map((day, dayIndex) => <View key={day.dayNumber} style={styles.dayCard}>
          <View style={styles.dayHeader}><View style={styles.dayNumber}><Text style={styles.dayNumberText}>{day.dayNumber}</Text></View><Text style={styles.dayCardTitle}>Day {day.dayNumber}{day.entries.length > 1 ? ` · ${day.entries.length} workouts` : ''}</Text></View>
          {day.entries.map((entry, entryIndex) => <View key={entry.id} style={styles.entryCard}>
            <View style={styles.entryHeader}>
              <View style={styles.flex}><AppInput label={day.entries.length > 1 ? `Label (e.g. Morning, Evening)` : `Day ${day.dayNumber} label`} value={entry.label} onChangeText={(label) => setWeekDays((current) => current.map((week, weekIndex) => weekIndex !== selectedWeek ? week : week.map((d, dIndex) => dIndex !== dayIndex ? d : { ...d, entries: d.entries.map((item, eIndex) => eIndex !== entryIndex ? item : { ...item, label }) })))} /></View>
              {day.entries.length > 1 ? <Pressable accessibilityRole="button" accessibilityLabel={`Remove this workout from Day ${day.dayNumber}`} onPress={() => removeEntryFromDay(dayIndex, entryIndex)} style={styles.removeEntry}><Ionicons name="close" size={18} color={colors.danger} /></Pressable> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Choose workout for day ${day.dayNumber}`} onPress={() => setPickerTarget({ dayIndex, entryIndex })} style={styles.workoutChoice}>
              <View style={styles.flex}>{entry.plan ? <><Text style={styles.workoutName}>{entry.plan.name}</Text><Text style={styles.muted}>Tap to choose a different workout</Text></> : <><Text style={styles.chooseText}>Choose a workout</Text><Text style={styles.muted}>Select an existing or starter workout</Text></>}</View>
              {entry.plan ? <WorkoutTypeBadge type={entry.plan.workoutType} /> : <Ionicons name="chevron-forward" size={20} color={colors.accent} />}
            </Pressable>
            {entry.plan ? <Pressable accessibilityRole="button" onPress={() => togglePreview(entry.plan!.id)} style={styles.previewToggle}><Text style={styles.previewToggleText}>{expandedPlanId === entry.plan.id ? 'Hide exercises ▲' : "What's inside this workout? ▾"}</Text></Pressable> : null}
            {entry.plan && expandedPlanId === entry.plan.id ? <PlanPreview plan={planDetails[entry.plan.id]} duplicating={duplicating} onDuplicate={() => void duplicateAndCustomize(entry.plan!, { dayIndex, entryIndex })} /> : null}
          </View>)}
          <AppButton label="+ Add Another Workout to This Day" variant="secondary" onPress={() => addEntryToDay(dayIndex)} />
        </View>)}
      </View>
      <AppButton label={saving ? submittingLabel : submitLabel} loading={saving} onPress={() => void save()} />
    </ScrollView>

    <Modal visible={pickerTarget !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickerTarget(null)}>
      <View style={styles.pickerScreen}>
        <View style={styles.pickerHeader}><View><Text style={styles.step}>PROGRAM DAY</Text><Text style={styles.pickerTitle}>Choose workout</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close workout picker" onPress={() => setPickerTarget(null)} style={styles.close}><Ionicons name="close" size={25} color={colors.text} /></Pressable></View>
        <View style={styles.search}>
          <AppButton label="+ Create New Workout" variant="secondary" onPress={createWorkoutForPickerTarget} />
          <Text style={styles.helper}>Or choose an existing workout below — tap a workout to preview its exercises</Text>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search workouts…" />
        </View>
        {plans === undefined ? <ActivityIndicator style={styles.flex} color={colors.accent} /> : <ScrollView contentContainerStyle={styles.planList}>{filteredPlans.map((plan) => <View key={plan.id}>
          <View style={styles.planRow}>
            <Pressable accessibilityRole="button" onPress={() => choosePlan(plan)} style={styles.flex}><Text style={styles.workoutName}>{plan.name}</Text><Text style={styles.muted}>{plan.isBuiltin ? 'Starter workout' : 'My workout'}</Text></Pressable>
            <WorkoutTypeBadge type={plan.workoutType} />
            <Pressable accessibilityRole="button" accessibilityLabel={`Preview exercises in ${plan.name}`} onPress={() => togglePreview(plan.id)} style={styles.previewIcon}><Ionicons name={expandedPlanId === plan.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.accent} /></Pressable>
          </View>
          {expandedPlanId === plan.id ? <PlanPreview plan={planDetails[plan.id]} duplicating={duplicating} onDuplicate={() => void duplicateAndCustomize(plan, pickerTarget!)} /> : null}
        </View>)}</ScrollView>}
      </View>
    </Modal>
  </KeyboardAvoidingView>;
}

function PlanPreview({ plan, onDuplicate, duplicating }: { plan: WorkoutPlanWithExercises | undefined; onDuplicate?: () => void; duplicating?: boolean }) {
  if (!plan) return <View style={styles.previewList}><ActivityIndicator color={colors.accent} /></View>;
  return <View style={styles.previewList}>
    {plan.exercises.length === 0 ? <Text style={styles.previewItem}>No exercises in this workout yet.</Text>
      : plan.exercises.map((item) => <Text key={item.id} style={styles.previewItem}>
        • {item.exercise.name}{item.targetSets ? ` — ${item.targetSets}×${item.targetRepsMin ?? '?'}${item.targetRepsMax && item.targetRepsMax !== item.targetRepsMin ? `-${item.targetRepsMax}` : ''}` : ''}
      </Text>)}
    {onDuplicate ? <AppButton label={duplicating ? 'Duplicating…' : 'Duplicate & Customize This Workout'} variant="secondary" loading={duplicating} onPress={onDuplicate} /> : null}
    {onDuplicate ? <Text style={styles.helperSmall}>Makes your own copy with these exercises, so you can change sets/reps/exercises just for this day without affecting the original.</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }, intro: { gap: spacing.xs },
  eyebrow: { ...typography.caption, color: colors.accent, fontWeight: '900', letterSpacing: 1.2 }, title: { ...typography.title, color: colors.text }, muted: { ...typography.caption, color: colors.textMuted },
  card: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.md }, step: { fontSize: 11, color: colors.accent, fontWeight: '900', letterSpacing: 1 },
  label: { ...typography.label, color: colors.text }, heading: { ...typography.heading, color: colors.text }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dayCounts: { flexDirection: 'row', gap: spacing.xs }, dayCount: { flex: 1, minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, dayCountSelected: { backgroundColor: colors.accent, borderColor: colors.accent }, dayCountText: { ...typography.label, color: colors.text }, dayCountTextSelected: { color: colors.accentText },
  weekChips: { flexDirection: 'row', gap: spacing.xs, paddingBottom: spacing.xs }, weekChip: { minWidth: 76, minHeight: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm }, weekChipSelected: { backgroundColor: colors.accent, borderColor: colors.accent }, weekChipText: { ...typography.label, color: colors.text }, weekChipTextSelected: { color: colors.accentText }, weekChipMeta: { ...typography.caption, color: colors.textMuted },
  dayStepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm }, dayStepperButtons: { flexDirection: 'row', gap: spacing.sm }, stepperButton: { width: 36, height: 36, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, stepperButtonDisabled: { opacity: 0.4 },
  dayCard: { gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }, dayHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, dayNumber: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }, dayNumberText: { ...typography.heading, color: colors.accentText }, dayCardTitle: { ...typography.label, color: colors.text }, flex: { flex: 1 },
  entryCard: { gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  entryHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  removeEntry: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  workoutChoice: { minHeight: 68, borderRadius: radius.md, padding: spacing.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, workoutName: { ...typography.body, color: colors.text, fontWeight: '800' }, chooseText: { ...typography.body, color: colors.accent, fontWeight: '800' }, helper: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  previewToggle: { minHeight: 32, justifyContent: 'center' }, previewToggleText: { ...typography.caption, color: colors.accent, fontWeight: '700' },
  previewList: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, gap: spacing.xs }, previewItem: { ...typography.caption, color: colors.text },
  helperSmall: { ...typography.caption, color: colors.textMuted, fontStyle: 'italic' },
  pickerScreen: { flex: 1, backgroundColor: colors.background }, pickerHeader: { padding: spacing.lg, paddingTop: spacing.xl, flexDirection: 'row', alignItems: 'center' }, pickerTitle: { ...typography.title, color: colors.text }, close: { marginLeft: 'auto', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, search: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.sm }, planList: { padding: spacing.lg, gap: spacing.sm }, planRow: { minHeight: 70, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, previewIcon: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
});
