import { format, subDays, subMonths, subYears } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppScreen } from '@/components/AppScreen';
import { FilterChip } from '@/components/FilterChip';
import { MeasurementDifferenceBadge } from '@/components/MeasurementDifferenceBadge';
import { ProgressChart } from '@/components/ProgressChart';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useSettings } from '@/contexts/SettingsContext';
import { useDatabase } from '@/hooks/useDatabase';
import { createWeightEntry, deleteWeightEntry, getWeightHistory } from '@/repositories/bodyWeightRepository';
import type { BodyWeightEntry } from '@/types/body';
import { displayToKilograms, kilogramsToDisplay } from '@/utils/units';

type Filter = '30d' | '3m' | '6m' | '1y' | 'all';
const fromFor = (filter: Filter): string | undefined => { const now = new Date(); const date = filter === '30d' ? subDays(now, 30) : filter === '3m' ? subMonths(now, 3) : filter === '6m' ? subMonths(now, 6) : filter === '1y' ? subYears(now, 1) : null; return date?.toISOString(); };

export default function WeightHistory() {
  const db = useDatabase(); const { settings } = useSettings();
  const [rows, setRows] = useState<BodyWeightEntry[]>([]); const [filter, setFilter] = useState<Filter>('3m');
  const [weight, setWeight] = useState(''); const [notes, setNotes] = useState(''); const [saving, setSaving] = useState(false);
  const load = useCallback(() => { void getWeightHistory(db, fromFor(filter)).then(setRows); }, [db, filter]);
  useFocusEffect(load);
  const save = async () => { try { setSaving(true); const parsed = Number(weight.trim().replace(',', '.')); await createWeightEntry(db, { weightKg: displayToKilograms(parsed, settings.weightUnit), measuredAt: new Date().toISOString(), notes: notes.trim() || null }); setWeight(''); setNotes(''); load(); } catch (error) { Alert.alert('Could not save weight', error instanceof Error ? error.message : 'Enter a valid weight.'); } finally { setSaving(false); } };
  const current = rows[0]; const previous = rows[1]; const change = current && previous ? kilogramsToDisplay(current.weightKg - previous.weightKg, settings.weightUnit) : null;
  const points = useMemo(() => [...rows].reverse().map((entry) => ({ label: format(new Date(entry.measuredAt), 'MMM d'), value: kilogramsToDisplay(entry.weightKg, settings.weightUnit) })), [rows, settings.weightUnit]);

  return <AppScreen scroll>
    <View style={styles.hero}>
      <View style={styles.heroTop}><Text style={styles.emoji}>⚖️</Text><View style={styles.flex}><Text style={styles.eyebrow}>CURRENT WEIGHT</Text><Text style={styles.current}>{current ? `${kilogramsToDisplay(current.weightKg, settings.weightUnit).toFixed(1)} ${settings.weightUnit}` : 'No entries yet'}</Text></View>{change != null ? <MeasurementDifferenceBadge value={change} unit={settings.weightUnit} /> : null}</View>
      <Text style={styles.heroHint}>{current ? `Last updated ${format(new Date(current.measuredAt), 'MMM d, yyyy')}` : 'Add your first entry to begin your trend.'}</Text>
    </View>

    <View style={styles.addCard}>
      <View><Text style={styles.addEyebrow}>QUICK CHECK-IN</Text><Text style={styles.addTitle}>➕ Add today’s weight</Text><Text style={styles.muted}>This immediately updates your Body Progress trend.</Text></View>
      <AppInput accessibilityLabel={`Weight in ${settings.weightUnit}`} label={`Weight (${settings.weightUnit})`} placeholder={settings.weightUnit === 'kg' ? 'e.g. 75.5' : 'e.g. 166.4'} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} />
      <AppInput label="Note — optional" placeholder="e.g. Morning, before breakfast" value={notes} onChangeText={setNotes} />
      <AppButton label="Save Weight" loading={saving} disabled={!weight.trim()} onPress={() => void save()} />
    </View>

    <View style={styles.section}><Text style={styles.sectionTitle}>📈 Weight trend</Text><View style={styles.filters}>{([['30d', '30 days'], ['3m', '3 months'], ['6m', '6 months'], ['1y', '1 year'], ['all', 'All time']] as const).map(([id, label]) => <FilterChip key={id} label={label} selected={filter === id} onPress={() => setFilter(id)} />)}</View><ProgressChart type="line" points={points} unitLabel={settings.weightUnit} emptyMessage="Add your first weight entry to see a trend." /></View>

    <View style={styles.section}><Text style={styles.sectionTitle}>🗓️ History</Text>
      {rows.length === 0 ? <View style={styles.empty}><Text style={styles.emptyEmoji}>⚖️</Text><Text style={styles.cardTitle}>No weight entries yet</Text><Text style={styles.muted}>Use the highlighted form above to add your first check-in.</Text></View>
        : rows.map((row, index) => { const rowChange = rows[index + 1] ? kilogramsToDisplay(row.weightKg - rows[index + 1].weightKg, settings.weightUnit) : null; return <View key={row.id} style={styles.historyCard}><View style={styles.flex}><Text style={styles.historyValue}>{kilogramsToDisplay(row.weightKg, settings.weightUnit).toFixed(1)} {settings.weightUnit}</Text><Text style={styles.historyDate}>{format(new Date(row.measuredAt), 'EEEE, MMM d, yyyy')}</Text>{row.notes ? <Text style={styles.note}>{row.notes}</Text> : null}</View>{rowChange != null ? <MeasurementDifferenceBadge value={rowChange} unit={settings.weightUnit} /> : null}<Pressable accessibilityRole="button" accessibilityLabel={`Delete weight entry from ${format(new Date(row.measuredAt), 'MMMM d')}`} onPress={() => Alert.alert('Delete weight entry?', 'This cannot be undone.', [{ text: 'Keep Entry', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void deleteWeightEntry(db, row.id).then(load) }])} style={styles.delete}><Text style={styles.deleteText}>Delete</Text></Pressable></View>; })}
    </View>
  </AppScreen>;
}

const styles = StyleSheet.create({
  hero: { padding: spacing.lg, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: spacing.sm }, heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, emoji: { fontSize: 34 }, flex: { flex: 1 }, eyebrow: { ...typography.caption, color: colors.textMuted, fontWeight: '900', letterSpacing: 1 }, current: { ...typography.title, color: colors.text, fontSize: 30 }, heroHint: { ...typography.caption, color: colors.textMuted },
  addCard: { padding: spacing.lg, borderRadius: 22, backgroundColor: '#10291B', borderWidth: 2, borderColor: colors.accent, gap: spacing.md }, addEyebrow: { ...typography.caption, color: colors.accent, fontWeight: '900', letterSpacing: 1 }, addTitle: { ...typography.heading, color: colors.text, fontSize: 20 }, muted: { ...typography.caption, color: colors.textMuted },
  section: { gap: spacing.md }, sectionTitle: { ...typography.heading, color: colors.text, fontSize: 20 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  empty: { padding: spacing.xl, borderRadius: radius.lg, backgroundColor: colors.surface, alignItems: 'center', gap: spacing.sm }, emptyEmoji: { fontSize: 32 }, cardTitle: { ...typography.heading, color: colors.text },
  historyCard: { padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: spacing.md }, historyValue: { ...typography.heading, color: colors.text, fontSize: 20 }, historyDate: { ...typography.caption, color: colors.textMuted }, note: { ...typography.caption, color: colors.text, marginTop: spacing.xs }, delete: { minWidth: 48, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, deleteText: { ...typography.caption, color: colors.danger, fontWeight: '800' },
});
