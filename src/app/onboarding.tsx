import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { FilterChip } from '@/components/FilterChip';
import { ProfileForm } from '@/components/ProfileForm';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useSettings } from '@/contexts/SettingsContext';
import { useDatabase } from '@/hooks/useDatabase';
import { upsertProfile } from '@/repositories/userProfileRepository';
import { completeOnboarding } from '@/services/onboardingService';

const titles = ['Welcome to LiftDG', 'Tell us about you', 'Choose your units', 'You’re ready'];
const tips = [
  ['▶️', 'Start', 'Use the Start tab for a quick workout or one scheduled for today.'],
  ['📅', 'Plan', 'Build programs and schedule workouts from the Training calendar.'],
  ['✅', 'Track', 'Enter your reps and weight, then complete each set. Changes save automatically.'],
  ['📈', 'Review', 'History, Progress, and Body Progress show how your training changes over time.'],
] as const;

export default function Onboarding() {
  const db = useDatabase();
  const { settings, setSetting } = useSettings();
  const [step, setStep] = useState(0);
  const next = () => setStep((value) => value + 1);
  const finish = async () => { await completeOnboarding(); router.replace('/'); };

  return <AppScreen scroll>
    <View style={styles.page} accessibilityLiveRegion="polite">
      <View style={styles.topBar}>
        {step > 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => setStep((value) => value - 1)} style={styles.back}><Text style={styles.backText}>‹ Back</Text></Pressable> : <View />}
        <Text style={styles.step}>{step + 1} of {titles.length}</Text>
      </View>
      <View style={styles.progress}>{titles.map((title, index) => <View key={title} style={[styles.progressBar, index <= step && styles.progressActive]} />)}</View>

      <View style={styles.heading}>
        <Text style={styles.emoji}>{step === 0 ? '💪' : step === 1 ? '👤' : step === 2 ? '⚙️' : '🎉'}</Text>
        <Text accessibilityRole="header" style={styles.title}>{titles[step]}</Text>
      </View>

      {step === 0 ? <View style={styles.content}>
        <Text style={styles.brand}>Track Every Rep</Text>
        <Text style={styles.copy}>Log strength and cardio, build workout plans, and follow your progress—all without an account.</Text>
        <View style={styles.privacy}><Text style={styles.privacyIcon}>🔒</Text><View style={styles.flex}><Text style={styles.cardTitle}>Private and offline</Text><Text style={styles.cardCopy}>Your profile and workout data stay on this device. You control any files you export.</Text></View></View>
        <AppButton label="Get Started" onPress={next} />
      </View> : null}

      {step === 1 ? <ProfileForm
        heightUnit={settings.heightUnit}
        weightUnit={settings.weightUnit}
        showNotes={false}
        onUnitChange={(height, weight) => { void setSetting('heightUnit', height); void setSetting('weightUnit', weight); }}
        onSubmit={async (input) => { await upsertProfile(db, input); next(); }}
        submitLabel="Save and Continue" /> : null}

      {step === 2 ? <View style={styles.content}>
        <Choice title="Weight" description="Used throughout workouts and body progress.">
          {(['kg', 'lb'] as const).map((value) => <FilterChip key={value} label={value === 'kg' ? 'Kilograms (kg)' : 'Pounds (lb)'} selected={settings.weightUnit === value} onPress={() => void setSetting('weightUnit', value)} />)}
        </Choice>
        <Choice title="Body measurements" description="Change between units anytime without changing stored data.">
          {(['cm', 'in'] as const).map((value) => <FilterChip key={value} label={value === 'cm' ? 'Centimeters (cm)' : 'Inches (in)'} selected={settings.bodyMeasurementUnit === value} onPress={() => void setSetting('bodyMeasurementUnit', value)} />)}
        </Choice>
        <Choice title="First day of the week" description="Used by your Training calendar.">
          <FilterChip label="Sunday" selected={settings.firstDayOfWeek === 0} onPress={() => void setSetting('firstDayOfWeek', 0)} />
          <FilterChip label="Monday" selected={settings.firstDayOfWeek === 1} onPress={() => void setSetting('firstDayOfWeek', 1)} />
        </Choice>
        <AppButton label="Continue" onPress={next} />
      </View> : null}

      {step === 3 ? <View style={styles.content}>
        <Text style={styles.copy}>Here are the four things to know:</Text>
        <View style={styles.tips}>{tips.map(([icon, title, description]) => <View key={title} style={styles.tip}><Text style={styles.tipIcon}>{icon}</Text><View style={styles.flex}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardCopy}>{description}</Text></View></View>)}</View>
        <Text style={styles.note}>You can revisit this guide later from Settings.</Text>
        <AppButton label="Open LiftDG" onPress={() => void finish()} />
      </View> : null}
    </View>
  </AppScreen>;
}

function Choice({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <View style={styles.choice}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardCopy}>{description}</Text><View style={styles.row}>{children}</View></View>;
}

const styles = StyleSheet.create({
  page: { minHeight: 620, gap: spacing.xl, paddingVertical: spacing.lg },
  topBar: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { minHeight: 44, justifyContent: 'center', paddingRight: spacing.md }, backText: { ...typography.label, color: colors.accent }, step: { ...typography.caption, color: colors.textMuted },
  progress: { flexDirection: 'row', gap: spacing.sm }, progressBar: { height: 4, flex: 1, borderRadius: 2, backgroundColor: colors.surfaceElevated }, progressActive: { backgroundColor: colors.accent },
  heading: { alignItems: 'center', gap: spacing.sm }, emoji: { fontSize: 44 }, title: { ...typography.title, color: colors.text, fontSize: 32, textAlign: 'center' }, brand: { ...typography.heading, color: colors.accent, textAlign: 'center', fontSize: 21 },
  content: { gap: spacing.lg }, copy: { ...typography.body, color: colors.textMuted, lineHeight: 25, textAlign: 'center' },
  privacy: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: '#10291B', borderWidth: 1, borderColor: colors.accent }, privacyIcon: { fontSize: 26 }, flex: { flex: 1 }, cardTitle: { ...typography.label, color: colors.text }, cardCopy: { ...typography.caption, color: colors.textMuted, lineHeight: 19, marginTop: 3 },
  choice: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  tips: { gap: spacing.sm }, tip: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, tipIcon: { fontSize: 25 }, note: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
});
