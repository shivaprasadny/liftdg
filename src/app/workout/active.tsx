import { format } from 'date-fns';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Keyboard, KeyboardAvoidingView, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActiveExerciseSummaryCard } from '@/components/ActiveExerciseSummaryCard';
import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AutoAdvancePrompt } from '@/components/AutoAdvancePrompt';
import { ExerciseNavigationPicker } from '@/components/ExerciseNavigationPicker';
import { RestTimer } from '@/components/RestTimer';
import { WorkoutGroupCard } from '@/components/WorkoutGroupCard';
import { WorkoutSetRow } from '@/components/WorkoutSetRow';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useSettings } from '@/contexts/SettingsContext';
import { useDatabase } from '@/hooks/useDatabase';
import { useExerciseNavigation } from '@/hooks/useExerciseNavigation';
import { useRestTimer } from '@/hooks/useRestTimer';
import { getGroupsForWorkout, updateCompletedRounds } from '@/repositories/workoutGroupRepository';
import { addWorkoutSet, deleteWorkoutSet, discardWorkout, getPreviousExercisePerformance, getWorkoutById, pauseWorkout, persistCurrentExercise, removeWorkoutExercise, reorderWorkoutExercise, resumeWorkout, skipWorkoutExercise, updateWorkoutNotes, updateWorkoutSet, workoutExerciseHasCompletedSets } from '@/repositories/workoutRepository';
import { buildExerciseNavigationItems } from '@/services/exerciseNavigationService';
import { elapsedSeconds, summarizeWorkout } from '@/services/workoutService';
import type { ActiveWorkout, PreviousExercisePerformance, WorkoutExercise } from '@/types/workout';
import type { WorkoutGroup } from '@/types/workoutGroup';
import { getUserMessage } from '@/utils/errors';

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export default function ActiveWorkoutScreen() {
  const { id, finish } = useLocalSearchParams<{ id: string; finish?: string }>();
  const db = useDatabase();
  const { settings } = useSettings();
  const [workout, setWorkout] = useState<ActiveWorkout | null>();
  const [groups, setGroups] = useState<WorkoutGroup[]>([]);
  const [previous, setPrevious] = useState<Record<string, PreviousExercisePerformance | null>>({});
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [now, setNow] = useState(Date.now());
  const [pickerVisible, setPickerVisible] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const flushers = useRef(new Map<string, () => Promise<void>>());
  const priorCompletion = useRef<Record<string, string>>({});
  const timer = useRestTimer(id ?? 'none');

  const load = useCallback(async () => {
    if (!id) return;
    const [result, nextGroups] = await Promise.all([getWorkoutById(db, id), getGroupsForWorkout(db, id)]);
    setWorkout(result); setGroups(nextGroups); setWorkoutNotes(result?.notes ?? '');
    if (result) {
      const values = await Promise.all(result.exercises.map(async (item) => [item.exerciseId, await getPreviousExercisePerformance(db, item.exerciseId, result.startedAt)] as const));
      setPrevious(Object.fromEntries(values));
    }
  }, [db, id]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(interval); }, []);

  const items = useMemo(() => buildExerciseNavigationItems(workout?.exercises ?? [], groups), [groups, workout?.exercises]);
  const navigation = useExerciseNavigation({ workoutId: id ?? 'none', items, openInListView: settings.openWorkoutInListView, openFirstIncomplete: settings.openFirstIncompleteExercise });
  useEffect(()=>{if(workout&&navigation.currentExerciseId&&navigation.currentExerciseId!==workout.currentExerciseId)void persistCurrentExercise(db,workout.id,navigation.currentExerciseId)},[db,navigation.currentExerciseId,workout]);

  const registerFlush = useCallback((setId: string, flush: () => Promise<void>) => {
    flushers.current.set(setId, flush);
    return () => { flushers.current.delete(setId); };
  }, []);
  const flushPendingInputs = useCallback(async () => {
    try { await Promise.all([...flushers.current.values()].map((flush) => flush())); }
    catch (error) { Alert.alert('Changes not saved', `${getUserMessage(error, 'Could not save your latest changes.')} Please retry before leaving this exercise.`); throw error; }
  }, []);
  const changeExercise = useCallback(async (action: () => void) => {
    try { await flushPendingInputs(); Keyboard.dismiss(); action(); setAutoAdvance(false); }
    catch { /* The focused editor remains mounted so entered values are retained. */ }
  }, [flushPendingInputs]);

  useEffect(() => {
    const current = navigation.currentExercise;
    if (!current) return;
    const before = priorCompletion.current[current.id];
    if (settings.autoAdvanceExercise && before && before !== 'complete' && current.completionStatus === 'complete' && navigation.canGoNext) setAutoAdvance(true);
    priorCompletion.current[current.id] = current.completionStatus;
  }, [navigation.canGoNext, navigation.currentExercise, settings.autoAdvanceExercise]);

  /** The only way to leave an active workout without finishing it — must stay reachable even when assertCanFinish would block Finish Workout entirely (e.g. zero completed sets). */
  const confirmDiscard = useCallback((title: string, message?: string) => {
    if (!workout) return;
    Alert.alert(title, message, [
      { text: 'Keep Going', style: 'cancel' },
      { text: 'Discard Workout', style: 'destructive', onPress: () => void discardWorkout(db, workout.id).then(() => router.replace('/start')) },
    ]);
  }, [db, workout]);
  const requestDiscard = useCallback(() => confirmDiscard('Cancel this workout?', 'This permanently discards the active workout and any sets you’ve logged. This cannot be undone.'), [confirmDiscard]);

  const requestFinish = useCallback(() => { if(!workout)return;void flushPendingInputs().then(()=>updateWorkoutNotes(db,workout.id,workoutNotes.trim()||null)).then(()=>router.push({pathname:'/workout/finish',params:{id:workout.id}})).catch(error=>Alert.alert('Some workout changes could not be saved',getUserMessage(error,'Retry before finishing.'))); }, [db,flushPendingInputs,workout,workoutNotes]);
  useEffect(() => { if (finish === '1' && workout) requestFinish(); }, [finish, requestFinish, workout]);

  const move = useCallback(async (index: number, direction: -1 | 1) => {
    if (!workout) return; const ids = workout.exercises.map((item) => item.id); const [item] = ids.splice(index, 1); ids.splice(index + direction, 0, item);
    await reorderWorkoutExercise(db, workout.id, ids); await load();
  }, [db, load, workout]);
  const remove = useCallback(async (item: WorkoutExercise) => {
    const completed = await workoutExerciseHasCompletedSets(db, item.id);
    const execute = () => void removeWorkoutExercise(db, item.id).then(load).catch((error) => Alert.alert('Could not remove exercise', getUserMessage(error)));
    Alert.alert(completed ? 'Remove completed exercise?' : 'Remove exercise?', completed ? 'Its completed sets will also be deleted.' : `Remove ${item.exercise.name} from this workout?`, [
      { text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: execute },
    ]);
  }, [db, load]);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => settings.enableExerciseSwipeNavigation && Math.abs(gesture.dx) > 55 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderRelease: (_, gesture) => { if (gesture.dx < 0 && navigation.canGoNext) void changeExercise(navigation.goNext); if (gesture.dx > 0 && navigation.canGoPrevious) void changeExercise(navigation.goPrevious); },
  }), [changeExercise, navigation.canGoNext, navigation.canGoPrevious, navigation.goNext, navigation.goPrevious, settings.enableExerciseSwipeNavigation]);

  if (workout === undefined) return <View style={styles.center}><ActivityIndicator size="large" color={colors.accent} /></View>;
  if (!workout) return <View style={styles.center}><Text style={styles.muted}>Workout not found.</Text></View>;
  const summary = summarizeWorkout(workout);
  const completedExercises = items.filter((item) => item.completionStatus === 'complete').length;

  const header = <>
    <View style={styles.hero}>
      <View style={styles.heroText}>
        <Text accessibilityRole="header" style={styles.title}>{workout.name}</Text>
        <Text style={styles.muted}>{workout.pausedAt?'Paused · ':''}{clock(elapsedSeconds(workout.startedAt, now, workout.totalPausedSeconds??0, workout.pausedAt))} · {completedExercises} of {items.length} exercises complete</Text>
        <Pressable accessibilityRole="button" onPress={()=>void (workout.pausedAt?resumeWorkout(db,workout.id):pauseWorkout(db,workout.id)).then(load).catch(error=>Alert.alert('Workout update failed',getUserMessage(error)))} style={styles.cancelLink}><Text style={styles.link}>{workout.pausedAt?'Resume Workout':'Pause Workout'}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel workout" onPress={requestDiscard} style={styles.cancelLink}><Text style={styles.remove}>Cancel Workout</Text></Pressable>
      </View>
      <AppButton label="Finish Workout" onPress={requestFinish} />
    </View>
    <View style={styles.stats}><Stat value={String(items.length)} label="Exercises" /><Stat value={String(summary.completedSets)} label="Sets done" /><Stat value={summary.totalVolume.toFixed(0)} label="Volume kg" /></View>
  </>;

  if (navigation.displayMode === 'list') return <FlatList style={styles.screen} contentContainerStyle={styles.content} data={items} keyExtractor={(item) => item.id} initialNumToRender={10} windowSize={7}
    ListHeaderComponent={<View style={styles.headerContent}>{header}<AppInput label="Workout notes" value={workoutNotes} onChangeText={setWorkoutNotes} onBlur={() => void updateWorkoutNotes(db, workout.id, workoutNotes.trim() || null)} placeholder="How did the session feel?" multiline />
      <AppButton label="Add Exercises" variant="secondary" onPress={() => router.push({ pathname: '/workout/add-exercises', params: { id: workout.id } })} />
      <View style={styles.row}><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/workout/create-group', params: { id: workout.id } })}><Text style={styles.link}>Group Exercises</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/cardio/create', params: { workoutId: workout.id } })}><Text style={styles.link}>+ Cardio Finisher</Text></Pressable></View>
      {groups.map((group) => <WorkoutGroupCard key={group.id} group={group} onRounds={(rounds) => void updateCompletedRounds(db, group.id, rounds).then(load)} />)}
      <Text accessibilityRole="header" style={styles.sectionTitle}>All Exercises</Text></View>}
    renderItem={({ item, index }) => <ActiveExerciseSummaryCard item={item} index={index} total={items.length} onFocus={() => navigation.goToExercise(item.id)} onMoveUp={() => void move(index, -1)} onMoveDown={() => void move(index, 1)} />}
    ListEmptyComponent={<View style={styles.empty}><Text style={styles.exerciseName}>No exercises yet</Text><Text style={styles.muted}>Add an exercise to begin logging this workout.</Text></View>} />;

  const current = navigation.currentExercise;
  if (!current) return <View style={styles.center}><AppButton label="Return to workout list" onPress={navigation.returnToList} /></View>;
  const exercise = current.workoutExercise;
  const currentGroupId = current.group?.id;
  const nextForPrompt = navigation.nextExercise ?? (current.group?.type === 'circuit' ? items.find((item) => item.group?.id === currentGroupId && item.group?.position === 0) : null);
  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} {...panResponder.panHandlers}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {header}
      <View style={styles.focusActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Return to workout list" onPress={() => void changeExercise(navigation.returnToList)} style={styles.back}><Text style={styles.link}>← All Exercises</Text></Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add exercises to this workout"
          onPress={() => void changeExercise(() => router.push({ pathname: '/workout/add-exercises', params: { id: workout.id } }))}
          style={styles.addExerciseButton}>
          <Text style={styles.addExerciseText}>＋ Add Exercise</Text>
        </Pressable>
      </View>
      <View style={styles.focusHeader}>
        {current.group ? <Text style={styles.group}>{current.group.label}{current.group.type === 'circuit' && navigation.circuitRound ? ` · Round ${navigation.circuitRound} of ${current.group.targetRounds}` : ''}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel={`View exercise details for ${current.name}`} onPress={() => router.push({ pathname: '/exercises/[id]', params: { id: exercise.exerciseId } })}>
          <Text accessibilityRole="header" style={styles.focusName}>{current.name}</Text>
        </Pressable>
        {settings.showExercisePosition ? <Pressable accessibilityRole="button" accessibilityLabel={`Exercise ${navigation.currentExerciseIndex + 1} of ${navigation.totalExerciseCount}. Open exercise picker`} onPress={() => setPickerVisible(true)} style={styles.position}><Text style={styles.positionText}>Exercise {navigation.currentExerciseIndex + 1} of {navigation.totalExerciseCount} ▾</Text></Pressable> : null}
        {current.group ? <Text style={styles.muted}>{current.group.position + 1} of {current.group.size} in group</Text> : null}
        <Text style={styles.muted}>{current.category} · {current.exerciseType}</Text>
      </View>
      {autoAdvance && nextForPrompt ? <AutoAdvancePrompt nextName={nextForPrompt.name} onCancel={() => setAutoAdvance(false)} onAdvance={() => void changeExercise(navigation.goNext)} /> : null}
      <View style={styles.exercise}>
        <Text style={styles.muted}>Target {exercise.targetSets ?? '—'} sets · {exercise.targetRepsMin ?? '—'}–{exercise.targetRepsMax ?? '—'} reps · Rest {exercise.restSeconds ?? 0}s</Text>
        {exercise.targetWeight != null ? <Text style={styles.muted}>Target weight {exercise.targetWeight} kg</Text> : null}
        {exercise.notes ? <Text style={styles.notes}>{exercise.notes}</Text> : null}
        {previous[exercise.exerciseId] ? <Text style={styles.placeholder}>Previous {previous[exercise.exerciseId]?.weight ?? 0} kg × {previous[exercise.exerciseId]?.reps ?? 0} · {previous[exercise.exerciseId]?.setCount} sets · {format(new Date(previous[exercise.exerciseId]!.workoutDate), 'MMM d')}</Text> : <Text style={styles.placeholder}>No previous completed performance</Text>}
        {exercise.sets.map((set, setIndex) => <Fragment key={set.id}>
          <WorkoutSetRow set={set} previous={exercise.sets[setIndex - 1]} registerFlush={registerFlush} onSave={async (value) => { await updateWorkoutSet(db, set.id, value); await load(); }} onDelete={() => void deleteWorkoutSet(db, set.id).then(load)} onComplete={(completed) => { if (completed && exercise.restSeconds && settings.autoStartRestTimer) timer.start(exercise.restSeconds, set.id); }} />
          {timer.remaining > 0 && timer.anchorSetId === set.id ? <View style={styles.inlineTimer}><Text accessibilityRole="header" style={styles.timerIndicator}>Rest before your next set</Text><RestTimer timer={timer} /></View> : null}
        </Fragment>)}
        <View style={styles.row}><Pressable accessibilityRole="button" accessibilityLabel={`Replace ${exercise.exercise.name}`} onPress={() => router.push({pathname:'/workout/replace-exercise',params:{id:workout.id,workoutExerciseId:exercise.id}})}><Text style={styles.link}>Replace</Text></Pressable><Pressable accessibilityRole="button" onPress={() => Alert.alert('Add set','Choose a set type',[{text:'Working',onPress:()=>void addWorkoutSet(db,exercise.id,undefined,'working').then(load)},{text:'Warm-up',onPress:()=>void addWorkoutSet(db,exercise.id,undefined,'warmup').then(load)},{text:'Drop',onPress:()=>void addWorkoutSet(db,exercise.id,exercise.sets.at(-1),'drop').then(load)},{text:'AMRAP',onPress:()=>void addWorkoutSet(db,exercise.id,exercise.sets.at(-1),'amrap').then(load)},{text:'Cancel',style:'cancel'}])}><Text style={styles.link}>+ Add Set</Text></Pressable><Pressable accessibilityRole="button" onPress={()=>Alert.alert('Skip exercise?',exercise.exercise.name,[{text:'Cancel',style:'cancel'},{text:'Skip',onPress:()=>void skipWorkoutExercise(db,exercise.id,null).then(load)}])}><Text style={styles.remove}>Skip</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${exercise.exercise.name}`} onPress={() => void remove(exercise)}><Text style={styles.remove}>Remove</Text></Pressable></View>
      </View>
    </ScrollView>
    <View style={styles.footer}>
      <AppButton label="Previous Exercise" variant="secondary" disabled={!navigation.canGoPrevious} accessibilityState={{ disabled: !navigation.canGoPrevious }} onPress={() => void changeExercise(navigation.goPrevious)} style={styles.footerButton}/>
      <Pressable accessibilityRole="button" accessibilityLabel="Open exercise picker" onPress={() => setPickerVisible(true)} style={styles.footerPosition}><Text style={styles.positionText}>{navigation.currentExerciseIndex + 1} of {navigation.totalExerciseCount}</Text></Pressable>
      <AppButton label="Next Exercise" disabled={!navigation.canGoNext} accessibilityState={{ disabled: !navigation.canGoNext }} onPress={() => void changeExercise(navigation.goNext)} style={styles.footerButton}/>
    </View>
    <ExerciseNavigationPicker visible={pickerVisible} items={items} selectedId={current.id} onClose={() => setPickerVisible(false)} onSelect={(exerciseId) => { setPickerVisible(false); void changeExercise(() => navigation.goToExercise(exerciseId)); }} />
  </KeyboardAvoidingView>;
}

function Stat({ value, label }: { value: string; label: string }) { return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>; }
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md }, headerContent: { gap: spacing.md, marginBottom: spacing.md }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, heroText: { flex: 1 }, title: { ...typography.title, color: colors.text }, muted: { ...typography.caption, color: colors.textMuted },
  cancelLink: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: spacing.sm }, stat: { flex: 1, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center' }, statValue: { ...typography.heading, color: colors.text }, statLabel: { ...typography.caption, color: colors.textMuted },
  inlineTimer: { gap: spacing.sm, marginTop: spacing.xs }, timerIndicator: { ...typography.label, color: colors.warning }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }, link: { ...typography.label, color: colors.accent }, remove: { ...typography.label, color: colors.danger }, sectionTitle: { ...typography.heading, color: colors.text, marginTop: spacing.sm }, empty: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  focusActions: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }, back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }, addExerciseButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: '#10291B', borderWidth: 1, borderColor: colors.accent }, addExerciseText: { ...typography.label, color: colors.accent }, focusHeader: { alignItems: 'center', gap: spacing.xs }, focusName: { ...typography.title, color: colors.text, textAlign: 'center' }, group: { ...typography.label, color: colors.accent, textTransform: 'uppercase' }, position: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md }, positionText: { ...typography.label, color: colors.text },
  exercise: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.md }, exerciseName: { ...typography.heading, color: colors.text }, notes: { ...typography.caption, color: colors.text, fontStyle: 'italic' }, placeholder: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, paddingBottom: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface }, footerButton: { flex: 1, paddingHorizontal: spacing.sm }, footerPosition: { minWidth: 58, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
