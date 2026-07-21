import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { EmptyState } from '@/components/EmptyState';
import { FilterChip } from '@/components/FilterChip';
import { Header } from '@/components/Header';
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
  const db = useDatabase(); const { settings } = useSettings();
  const [profile, setProfile] = useState<UserProfile | null>(); const [weights, setWeights] = useState<BodyWeightEntry[]>([]);
  const [entries, setEntries] = useState<BodyMeasurementEntry[]>([]); const [selectedTypeId, setSelectedTypeId] = useState<string>();
  useFocusEffect(useCallback(() => { void Promise.all([getProfile(db), getWeightHistory(db), getMeasurementHistory(db)]).then(([p, w, e]) => { setProfile(p); setWeights(w); setEntries(e); setSelectedTypeId((current) => current ?? e.flatMap((entry) => entry.values)[0]?.measurementTypeId); }); }, [db]));
  const availableTypes = useMemo(() => { const map = new Map<string, string>(); const keys=new Set<string>();entries.flatMap((entry) => entry.values).forEach((value) => {map.set(value.measurementTypeId, value.measurementType?.displayName ?? value.measurementTypeId);if(value.measurementType?.key)keys.add(value.measurementType.key)});for(const part of ['biceps','thigh','calf'])if(keys.has(`left_${part}`)&&keys.has(`right_${part}`))map.set(`average:${part}`,`${part[0].toUpperCase()}${part.slice(1)} average`);return [...map]; }, [entries]);
  if (profile === undefined) return <AppScreen header={<Header title="Body Progress" />} />;
  if (!profile) return <AppScreen header={<Header title="Body Progress" />}><EmptyState title="Complete your profile" message="Complete your profile to personalize LiftDG." /><AppButton label="Create profile" onPress={() => router.push('/settings/profile')} /></AppScreen>;
  const comparison = entries.length > 1 ? compareMeasurementEntries(entries[0], entries[1]) : null;
  const weightChange = weights.length > 1 ? weights[0].weightKg - weights[1].weightKg : null;
  const measurementPoints = selectedTypeId?.startsWith('average:') ? entries.flatMap(entry=>{const part=selectedTypeId.slice(8);const left=entry.values.find(value=>value.measurementType?.key===`left_${part}`)?.valueCm??null;const right=entry.values.find(value=>value.measurementType?.key===`right_${part}`)?.valueCm??null;const value=averageLeftRight(left,right);return value==null?[]:[{date:entry.measuredAt,value:settings.bodyMeasurementUnit==='in'?value/2.54:value,unit:settings.bodyMeasurementUnit}]}).sort((a,b)=>a.date.localeCompare(b.date)) : selectedTypeId ? buildMeasurementChartPoints(entries, selectedTypeId, settings.bodyMeasurementUnit) : [];
  const weightPoints = [...weights].reverse().map((entry) => ({ label: new Date(entry.measuredAt).toLocaleDateString(), value: kilogramsToDisplay(entry.weightKg, settings.weightUnit) }));
  return <AppScreen scroll header={<Header title="Body Progress" />}>
    <View style={styles.hero}><Text style={styles.name}>{profile.name}</Text><Text style={styles.value}>{profile.currentWeightKg == null ? 'No weight yet' : `${kilogramsToDisplay(profile.currentWeightKg, settings.weightUnit).toFixed(1)} ${settings.weightUnit}`}</Text>{weightChange != null ? <MeasurementDifferenceBadge value={kilogramsToDisplay(weightChange, settings.weightUnit)} unit={settings.weightUnit} /> : null}</View>
    <View style={styles.row}><AppButton label="Add measurements" onPress={() => router.push('/body/measurements/create')} style={styles.flex} /><AppButton label="Add weight" variant="secondary" onPress={() => router.push('/body/weight')} style={styles.flex} /></View>
    <SectionHeader>Weight trend</SectionHeader><ProgressChart type="line" points={weightPoints} unitLabel={settings.weightUnit} emptyMessage="Add your first weight entry to start tracking progress." />
    <SectionHeader>Measurement trend</SectionHeader><View style={styles.chips}>{availableTypes.map(([id, name]) => <FilterChip key={id} label={name} selected={selectedTypeId === id} onPress={() => setSelectedTypeId(id)} />)}</View>
    {selectedTypeId ? <ProgressChart type="line" points={measurementPoints.map((point) => ({ label: new Date(point.date).toLocaleDateString(), value: point.value }))} unitLabel={settings.bodyMeasurementUnit} emptyMessage="No data for this measurement." /> : <Text style={styles.muted}>Choose a measurement to view its trend.</Text>}
    <SectionHeader>Latest changes</SectionHeader>{comparison ? comparison.differences.slice(0, 6).map((difference) => <View key={difference.measurementTypeId} style={styles.line}><Text style={styles.text}>{difference.displayName}</Text><MeasurementDifferenceBadge value={settings.bodyMeasurementUnit === 'in' ? difference.difference / 2.54 : difference.difference} unit={settings.bodyMeasurementUnit} /></View>) : <Text style={styles.muted}>Add at least two measurement entries to see differences.</Text>}
    <AppButton label="Measurement history" variant="secondary" onPress={() => router.push('/body/measurements')} /><AppButton label="Compare measurements" variant="secondary" onPress={() => router.push('/body/measurements/compare')} /><AppButton label="Measurement preferences" variant="secondary" onPress={() => router.push('/body/preferences')} />
  </AppScreen>;
}
const styles = StyleSheet.create({ hero: { padding: spacing.lg, gap: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface }, name: { ...typography.heading, color: colors.text }, value: { ...typography.title, color: colors.text }, row: { flexDirection: 'row', gap: spacing.sm }, flex: { flex: 1 }, line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm }, text: { ...typography.body, color: colors.text }, muted: { ...typography.body, color: colors.textMuted }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm } });
