import { format } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { EmptyState } from '@/components/EmptyState';
import { FilterChip } from '@/components/FilterChip';
import { MeasurementDifferenceBadge } from '@/components/MeasurementDifferenceBadge';
import { ProgressChart } from '@/components/ProgressChart';
import { SectionHeader } from '@/components/SectionHeader';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useSettings } from '@/contexts/SettingsContext';
import { useDatabase } from '@/hooks/useDatabase';
import { getMeasurementHistory } from '@/repositories/bodyMeasurementRepository';
import { getWeightHistory } from '@/repositories/bodyWeightRepository';
import { getProfile } from '@/repositories/userProfileRepository';
import { averageLeftRight, buildMeasurementChartPoints, compareMeasurementEntries } from '@/services/bodyMeasurementService';
import type { BodyMeasurementEntry, BodyWeightEntry, UserProfile } from '@/types/body';
import { kilogramsToDisplay } from '@/utils/units';

export default function BodyProgress() {
  const db = useDatabase();
  const { settings } = useSettings();
  const [profile, setProfile] = useState<UserProfile | null>();
  const [weights, setWeights] = useState<BodyWeightEntry[]>([]);
  const [entries, setEntries] = useState<BodyMeasurementEntry[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>();

  useFocusEffect(useCallback(() => {
    void Promise.all([getProfile(db), getWeightHistory(db), getMeasurementHistory(db)]).then(([nextProfile, nextWeights, nextEntries]) => {
      setProfile(nextProfile);
      setWeights(nextWeights);
      setEntries(nextEntries);
      setSelectedTypeId((current) => current ?? nextEntries.flatMap((entry) => entry.values)[0]?.measurementTypeId);
    });
  }, [db]));

  const availableTypes = useMemo(() => {
    const map = new Map<string, string>();
    const keys = new Set<string>();
    entries.flatMap((entry) => entry.values).forEach((value) => {
      map.set(value.measurementTypeId, value.measurementType?.displayName ?? value.measurementTypeId);
      if (value.measurementType?.key) keys.add(value.measurementType.key);
    });
    for (const part of ['biceps', 'thigh', 'calf']) {
      if (keys.has(`left_${part}`) && keys.has(`right_${part}`)) {
        map.set(`average:${part}`, `${part[0].toUpperCase()}${part.slice(1)} average`);
      }
    }
    return [...map];
  }, [entries]);

  if (profile === undefined) return <AppScreen />;
  if (!profile) {
    return <AppScreen>
      <EmptyState title="Complete your profile" message="Add your name and optional body details to personalize LiftDG." />
      <AppButton label="Create Profile" onPress={() => router.push('/settings/profile')} />
    </AppScreen>;
  }

  const comparison = entries.length > 1 ? compareMeasurementEntries(entries[0], entries[1]) : null;
  const weightChange = weights.length > 1 ? weights[0].weightKg - weights[1].weightKg : null;
  const measurementPoints = selectedTypeId?.startsWith('average:')
    ? entries.flatMap((entry) => {
      const part = selectedTypeId.slice(8);
      const left = entry.values.find((value) => value.measurementType?.key === `left_${part}`)?.valueCm ?? null;
      const right = entry.values.find((value) => value.measurementType?.key === `right_${part}`)?.valueCm ?? null;
      const value = averageLeftRight(left, right);
      return value == null ? [] : [{ date: entry.measuredAt, value: settings.bodyMeasurementUnit === 'in' ? value / 2.54 : value, unit: settings.bodyMeasurementUnit }];
    }).sort((a, b) => a.date.localeCompare(b.date))
    : selectedTypeId ? buildMeasurementChartPoints(entries, selectedTypeId, settings.bodyMeasurementUnit) : [];
  const weightPoints = [...weights].reverse().map((entry) => ({
    label: new Date(entry.measuredAt).toLocaleDateString(),
    value: kilogramsToDisplay(entry.weightKg, settings.weightUnit),
  }));
  const latestMeasurementDate = entries[0]?.measuredAt;

  return <AppScreen scroll>
    <View style={styles.headingRow}>
      <View>
        <Text style={styles.eyebrow}>BODY PROGRESS</Text>
        <Text style={styles.pageTitle}>Your progress, {profile.name}</Text>
      </View>
      <Text style={styles.headingEmoji} accessibilityLabel="Body progress">📊</Text>
    </View>

    <View style={styles.hero}>
      <Text style={styles.heroLabel}>⚖️ Current weight</Text>
      <Text style={styles.heroValue}>{profile.currentWeightKg == null
        ? 'Not recorded'
        : `${kilogramsToDisplay(profile.currentWeightKg, settings.weightUnit).toFixed(1)} ${settings.weightUnit}`}</Text>
      <View style={styles.heroMeta}>
        {weightChange != null
          ? <MeasurementDifferenceBadge value={kilogramsToDisplay(weightChange, settings.weightUnit)} unit={settings.weightUnit} />
          : <Text style={styles.heroHint}>Add two entries to see your change</Text>}
        <Text style={styles.heroHint}>{weights.length} weight {weights.length === 1 ? 'entry' : 'entries'}</Text>
      </View>
    </View>

    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add a new weight entry"
      onPress={() => router.push('/body/weight')}
      style={({ pressed }) => [styles.addWeightCard, pressed && styles.pressed]}>
      <View style={styles.actionIcon}><Text style={styles.actionEmoji}>➕</Text></View>
      <View style={styles.actionCopy}>
        <Text style={styles.addWeightTitle}>Add today’s weight</Text>
        <Text style={styles.addWeightText}>A quick check-in keeps your trend up to date.</Text>
      </View>
      <Text style={styles.actionArrow}>›</Text>
    </Pressable>

    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add body measurements"
      onPress={() => router.push('/body/measurements/create')}
      style={({ pressed }) => [styles.measurementAction, pressed && styles.pressed]}>
      <Text style={styles.measurementEmoji}>📏</Text>
      <View style={styles.actionCopy}>
        <Text style={styles.measurementTitle}>Add body measurements</Text>
        <Text style={styles.muted}>Record waist, chest, arms, legs, and more.</Text>
      </View>
      <Text style={styles.actionArrow}>›</Text>
    </Pressable>

    <View style={styles.sectionTitleRow}>
      <SectionHeader>Weight trend</SectionHeader>
      <AppButton label="View History" variant="secondary" onPress={() => router.push('/body/weight')} style={styles.compactButton} />
    </View>
    <View style={styles.chartCard}>
      <ProgressChart type="line" points={weightPoints} unitLabel={settings.weightUnit} emptyMessage="Add your first weight entry to start tracking progress." />
    </View>

    <SectionHeader>Measurement trend</SectionHeader>
    {availableTypes.length ? <View style={styles.chips}>{availableTypes.map(([id, name]) =>
      <FilterChip key={id} label={name} selected={selectedTypeId === id} onPress={() => setSelectedTypeId(id)} />)}</View> : null}
    <View style={styles.chartCard}>
      {selectedTypeId
        ? <ProgressChart type="line" points={measurementPoints.map((point) => ({ label: new Date(point.date).toLocaleDateString(), value: point.value }))} unitLabel={settings.bodyMeasurementUnit} emptyMessage="No data for this measurement." />
        : <EmptyState title="No measurement trend yet" message="Record a measurement check-in to see changes over time." />}
    </View>

    <View style={styles.sectionTitleRow}>
      <SectionHeader>Latest changes</SectionHeader>
      {latestMeasurementDate ? <Text style={styles.dateLabel}>{format(new Date(latestMeasurementDate), 'MMM d')}</Text> : null}
    </View>
    {comparison ? <View style={styles.changesCard}>{comparison.differences.slice(0, 6).map((difference, index) =>
      <View key={difference.measurementTypeId} style={[styles.changeRow, index > 0 && styles.divider]}>
        <Text style={styles.changeName}>{difference.displayName}</Text>
        <MeasurementDifferenceBadge value={settings.bodyMeasurementUnit === 'in' ? difference.difference / 2.54 : difference.difference} unit={settings.bodyMeasurementUnit} />
      </View>)}</View>
      : <View style={styles.infoCard}><Text style={styles.infoEmoji}>✨</Text><Text style={styles.muted}>Add at least two measurement entries to compare changes.</Text></View>}

    <SectionHeader>Explore</SectionHeader>
    <View style={styles.exploreGrid}>
      <AppButton label="🗓️ Measurement History" variant="secondary" onPress={() => router.push('/body/measurements')} style={styles.exploreButton} />
      <AppButton label="↔️ Compare" variant="secondary" onPress={() => router.push('/body/measurements/compare')} style={styles.exploreButton} />
    </View>
    <AppButton label="⚙️ Measurement Preferences" variant="secondary" onPress={() => router.push('/body/preferences')} />
  </AppScreen>;
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  eyebrow: { ...typography.label, color: colors.accent, letterSpacing: 1.2 },
  pageTitle: { ...typography.title, color: colors.text, marginTop: spacing.xs },
  headingEmoji: { fontSize: 34 },
  hero: { padding: spacing.xl, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  heroLabel: { ...typography.label, color: colors.textMuted },
  heroValue: { fontSize: 36, lineHeight: 42, fontWeight: '800', color: colors.text },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  heroHint: { ...typography.caption, color: colors.textMuted },
  addWeightCard: { minHeight: 92, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: '#10291B', borderWidth: 1, borderColor: colors.accent },
  actionIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  actionEmoji: { fontSize: 23 },
  actionCopy: { flex: 1, gap: 3 },
  addWeightTitle: { ...typography.heading, color: colors.text },
  addWeightText: { ...typography.body, color: '#B9D8C4' },
  actionArrow: { fontSize: 32, color: colors.textMuted },
  measurementAction: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border },
  measurementEmoji: { fontSize: 26 },
  measurementTitle: { ...typography.label, color: colors.text },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  compactButton: { minHeight: 40, paddingHorizontal: spacing.md },
  chartCard: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  dateLabel: { ...typography.caption, color: colors.textMuted },
  changesCard: { paddingHorizontal: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  changeRow: { minHeight: 58, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  changeName: { ...typography.body, color: colors.text, flex: 1 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface },
  infoEmoji: { fontSize: 24 },
  muted: { ...typography.body, color: colors.textMuted, flexShrink: 1 },
  exploreGrid: { flexDirection: 'row', gap: spacing.sm },
  exploreButton: { flex: 1, paddingHorizontal: spacing.sm },
});
