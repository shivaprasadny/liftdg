import Constants from 'expo-constants'; import { router } from 'expo-router'; import { useState } from 'react'; import { Alert } from 'react-native';
import { AppScreen } from '@/components/AppScreen'; import { HydrationCustomGoalModal, HydrationCustomServingModal } from '@/components/HydrationCustomGoalModal'; import { SettingsRow } from '@/components/SettingsRow'; import { SettingsSection } from '@/components/SettingsSection'; import { SettingsToggle } from '@/components/SettingsToggle'; import { useSettings } from '@/contexts/SettingsContext'; import { DATABASE_VERSION } from '@/database/schema'; import { applyHydrationGoalChange } from '@/repositories/hydrationGoalHistoryRepository'; import { formatServingAmount, formatWaterVolume } from '@/services/hydrationService'; import { BACKUP_FORMAT_VERSION } from '@/services/backupValidation'; import { resetOnboarding } from '@/services/onboardingService'; import { getBiometricAvailability,setSecureAppLock } from '@/services/securityService'; import { useDatabase } from '@/hooks/useDatabase'; import type { HydrationGoalApplyMode } from '@/types/hydration';

const goalPresetsMl = [1500, 2000, 2500, 3000, 3500, 4000];
const servingPresetsMl = [100, 200, 250, 300, 350, 500, 750];

export default function SettingsScreen() {
  const { settings, setSetting } = useSettings();
  const db = useDatabase();
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [servingModalOpen, setServingModalOpen] = useState(false);

  const choose = <T extends string>(title: string, values: T[], current: T, onChange: (v: T) => void) =>
    Alert.alert(title, undefined, values.map((v) => ({ text: `${v === current ? '✓ ' : ''}${v}`, onPress: () => onChange(v) })));
  const toggle = (key: keyof typeof settings) => (value: boolean) => void setSetting(key, value as never);

  /** A goal change asks which dates it should apply to before writing goal history, so past days keep grading against the goal that actually applied then. */
  const applyGoalChange = (newGoalMl: number) => {
    if (newGoalMl === settings.dailyWaterGoalMl) return;
    const commit = (mode: HydrationGoalApplyMode) => void applyHydrationGoalChange(db, settings.dailyWaterGoalMl, newGoalMl, mode)
      .then(() => setSetting('dailyWaterGoalMl', newGoalMl))
      .catch(() => Alert.alert('Could not update your daily goal.'));
    Alert.alert('Apply new goal', 'When should this daily goal take effect?', [
      { text: 'Starting Today', onPress: () => commit('today') },
      { text: 'Starting Tomorrow', onPress: () => commit('tomorrow') },
      { text: 'Apply to All History', style: 'destructive', onPress: () => Alert.alert('Apply to all history?', 'This changes the goal used to grade every past day, including your existing streaks and goal-day counts.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Apply', style: 'destructive', onPress: () => commit('all') }]) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const chooseGoal = () => Alert.alert('Daily goal', undefined, [
    ...goalPresetsMl.map((ml) => ({ text: `${ml === settings.dailyWaterGoalMl ? '✓ ' : ''}${formatWaterVolume(ml, settings.waterUnit)}`, onPress: () => applyGoalChange(ml) })),
    { text: 'Custom…', onPress: () => setGoalModalOpen(true) },
    { text: 'Cancel', style: 'cancel' },
  ]);
  const chooseServing = () => Alert.alert('Default serving', undefined, [
    ...servingPresetsMl.map((ml) => ({ text: `${ml === settings.defaultServingSizeMl ? '✓ ' : ''}${formatServingAmount(ml, settings.waterUnit)}`, onPress: () => void setSetting('defaultServingSizeMl', ml) })),
    { text: 'Custom…', onPress: () => setServingModalOpen(true) },
    { text: 'Cancel', style: 'cancel' },
  ]);

  return (
    <AppScreen scroll>
      <SettingsSection title="Profile"><SettingsRow label="Edit profile" onPress={() => router.push('/settings/profile')} /><SettingsRow label="Body progress" onPress={() => router.push('/body')} /><SettingsRow label="Weight history" onPress={() => router.push('/body/weight')} /><SettingsRow label="Body measurements" onPress={() => router.push('/body/measurements')} /><SettingsRow label="Measurement preferences" onPress={() => router.push('/body/preferences')} /><SettingsToggle label="Show Body Progress on Home" value={settings.showBodyProgressHome} onChange={toggle('showBodyProgressHome')} /></SettingsSection>
      <SettingsSection title="General"><SettingsRow label="Weight unit" value={settings.weightUnit} onPress={() => choose('Weight unit', ['kg', 'lb'], settings.weightUnit, (v) => void setSetting('weightUnit', v))} /><SettingsRow label="Distance unit" value={settings.distanceUnit} onPress={() => choose('Distance unit', ['km', 'mi'], settings.distanceUnit, (v) => void setSetting('distanceUnit', v))} /><SettingsRow label="First day of week" value={settings.firstDayOfWeek === 1 ? 'Monday' : 'Sunday'} onPress={() => void setSetting('firstDayOfWeek', settings.firstDayOfWeek === 1 ? 0 : 1)} /><SettingsRow label="Default workout name" value={settings.defaultWorkoutName} /><SettingsRow label="Default rest duration" value={`${settings.defaultRestDuration}s`} onPress={() => choose('Rest duration', ['30', '60', '90', '120', '180'], String(settings.defaultRestDuration), (v) => void setSetting('defaultRestDuration', Number(v)))} /><SettingsToggle label="Automatic rest timer" value={settings.automaticRestTimer} onChange={toggle('automaticRestTimer')} /><SettingsToggle label="Keep screen awake" value={settings.keepScreenAwake} onChange={toggle('keepScreenAwake')} /><SettingsToggle label="Confirm deleting sets" value={settings.confirmDeleteSets} onChange={toggle('confirmDeleteSets')} /><SettingsToggle label="Confirm finishing workouts" value={settings.confirmFinishWorkout} onChange={toggle('confirmFinishWorkout')} /></SettingsSection>
      <SettingsSection title="Body units"><SettingsRow label="Height unit" value={settings.heightUnit === 'cm' ? 'Centimeters' : 'Feet and inches'} onPress={() => void setSetting('heightUnit', settings.heightUnit === 'cm' ? 'ft_in' : 'cm')} /><SettingsRow label="Measurement unit" value={settings.bodyMeasurementUnit} onPress={() => void setSetting('bodyMeasurementUnit', settings.bodyMeasurementUnit === 'cm' ? 'in' : 'cm')} /></SettingsSection>
      <SettingsSection title="Hydration">
        <SettingsRow label="Daily goal" value={formatWaterVolume(settings.dailyWaterGoalMl, settings.waterUnit)} onPress={chooseGoal} />
        <SettingsRow label="Default serving" value={formatServingAmount(settings.defaultServingSizeMl, settings.waterUnit)} onPress={chooseServing} />
        <SettingsRow label="Units" value={settings.waterUnit === 'metric' ? 'Metric (mL / L)' : 'US (fl oz)'} onPress={() => choose('Water units', ['metric', 'us'], settings.waterUnit, (v) => void setSetting('waterUnit', v))} />
        <SettingsRow label="Celebration animation" value={settings.hydrationCelebration} onPress={() => choose('Celebration animation', ['full', 'simple', 'off'], settings.hydrationCelebration, (v) => void setSetting('hydrationCelebration', v))} />
        <SettingsToggle label="Remember expanded card" value={settings.rememberHydrationExpansion} onChange={toggle('rememberHydrationExpansion')} />
        <SettingsRow label="Reset hydration data" onPress={() => router.push('/settings/hydration-reset')} danger />
      </SettingsSection>
      <SettingsSection title="Appearance"><SettingsRow label="Theme" value={settings.theme} onPress={() => choose('Theme', ['system', 'light', 'dark'], settings.theme, (v) => void setSetting('theme', v))} /><SettingsToggle label="Compact workout layout" value={settings.compactWorkoutLayout} onChange={toggle('compactWorkoutLayout')} /><SettingsToggle label="Larger workout controls" value={settings.largerWorkoutControls} onChange={toggle('largerWorkoutControls')} /></SettingsSection>
      <SettingsSection title="Workout behavior"><SettingsToggle label="Auto-fill previous set" value={settings.autoFillPreviousSet} onChange={toggle('autoFillPreviousSet')} /><SettingsToggle label="Auto-start rest timer" value={settings.autoStartRestTimer} onChange={toggle('autoStartRestTimer')} /><SettingsToggle label="Show RPE" value={settings.showRpe} onChange={toggle('showRpe')} /><SettingsToggle label="Show notes" value={settings.showNotes} onChange={toggle('showNotes')} /><SettingsToggle label="Show previous performance" value={settings.showPreviousPerformance} onChange={toggle('showPreviousPerformance')} /><SettingsToggle label="Vibration feedback" value={settings.vibrationFeedback} onChange={toggle('vibrationFeedback')} /><SettingsToggle label="Timer sound" value={settings.timerSound} onChange={toggle('timerSound')} /></SettingsSection>
      <SettingsSection title="Active workout navigation"><SettingsToggle label="Open workout in list view" value={settings.openWorkoutInListView} onChange={toggle('openWorkoutInListView')} /><SettingsToggle label="Open on first incomplete exercise" value={settings.openFirstIncompleteExercise} onChange={toggle('openFirstIncompleteExercise')} /><SettingsToggle label="Auto-advance after exercise completion" value={settings.autoAdvanceExercise} onChange={toggle('autoAdvanceExercise')} /><SettingsToggle label="Enable swipe navigation" value={settings.enableExerciseSwipeNavigation} onChange={toggle('enableExerciseSwipeNavigation')} /><SettingsToggle label="Show exercise progress indicator" value={settings.showExercisePosition} onChange={toggle('showExercisePosition')} /></SettingsSection>
      <SettingsSection title="Video Library"><SettingsToggle label="Hide default exercise videos" value={settings.hideDefaultExerciseVideos} onChange={toggle('hideDefaultExerciseVideos')} /></SettingsSection>
      <SettingsSection title="Data"><SettingsRow label="Backup, export, and data management" onPress={() => router.push('/settings/data')} /></SettingsSection>
      <SettingsSection title="Security"><SettingsToggle label="App lock" value={settings.appLockEnabled} onChange={(value) => void (async () => { if (value) { const a = await getBiometricAvailability(); if (!a.available || !a.enrolled) { Alert.alert('App lock unavailable', 'Configure Face ID, Touch ID, or device biometrics first.'); return; } } await setSecureAppLock(value); await setSetting('appLockEnabled', value); })().catch(() => Alert.alert('App lock', 'Could not update app lock.'))} /><SettingsToggle label="Lock after backgrounding" value={settings.lockAfterBackground} onChange={toggle('lockAfterBackground')} /></SettingsSection>
      <SettingsSection title="About"><SettingsRow label="View onboarding" onPress={() => void resetOnboarding().then(() => router.replace('/onboarding'))} /><SettingsRow label="LiftDG" value="Track Every Rep" /><SettingsRow label="Version" value={Constants.expoConfig?.version ?? '1.0.0'} /><SettingsRow label="Database / backup format" value={`${DATABASE_VERSION} / ${BACKUP_FORMAT_VERSION}`} /><SettingsRow label="Privacy" value="Workout data stays on this device. LiftDG has no backend and uploads nothing. Files you share are controlled by the destination you choose." /></SettingsSection>

      <HydrationCustomGoalModal visible={goalModalOpen} waterUnit={settings.waterUnit} initialValueMl={settings.dailyWaterGoalMl} onClose={() => setGoalModalOpen(false)} onSave={applyGoalChange} />
      <HydrationCustomServingModal visible={servingModalOpen} waterUnit={settings.waterUnit} initialValueMl={settings.defaultServingSizeMl} dailyGoalMl={settings.dailyWaterGoalMl} onClose={() => setServingModalOpen(false)} onSave={(ml) => void setSetting('defaultServingSizeMl', ml)} />
    </AppScreen>
  );
}
