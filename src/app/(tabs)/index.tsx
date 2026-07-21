import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { PersonalRecordCard } from '@/components/PersonalRecordCard';
import { SectionHeader } from '@/components/SectionHeader';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useDatabase } from '@/hooks/useDatabase';
import { useSettings } from '@/contexts/SettingsContext';
import { getProfile } from '@/repositories/userProfileRepository';
import { getLatestMeasurementEntry } from '@/repositories/bodyMeasurementRepository';
import { getRecentPersonalRecords } from '@/repositories/personalRecordRepository';
import type { PersonalRecord } from '@/types/personalRecord';
import type { BodyMeasurementEntry, UserProfile } from '@/types/body';
import { kilogramsToDisplay } from '@/utils/units';

function greeting(): string { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }

export default function HomeScreen() {
  const db = useDatabase();
  const { settings } = useSettings();
  const [recentRecords, setRecentRecords] = useState<PersonalRecord[]>([]);
  const [profile,setProfile]=useState<UserProfile|null>(); const[latestMeasurement,setLatestMeasurement]=useState<BodyMeasurementEntry|null>();
  useFocusEffect(useCallback(() => { void Promise.all([getRecentPersonalRecords(db,3),getProfile(db),getLatestMeasurementEntry(db)]).then(([records,nextProfile,entry])=>{setRecentRecords(records);setProfile(nextProfile);setLatestMeasurement(entry)}); }, [db]));

  return <AppScreen scroll>
    <View style={styles.top}><View><Text style={styles.eyebrow}>{format(new Date(), 'EEEE, MMMM d')}</Text>
      <Text style={styles.title}>{greeting()}{profile?.name?`, ${profile.name}`:''}</Text><Text style={styles.tagline}>Track Every Rep</Text></View>
      <Pressable accessibilityLabel="Settings" onPress={() => router.push('/settings')} style={styles.settings}><Ionicons name="settings-outline" size={23} color={colors.text} /></Pressable></View>
    <View style={styles.hero}><Text style={styles.heroTitle}>Ready to train?</Text>
      <Text style={styles.heroCopy}>Your workout data stays private and on this device.</Text>
      <AppButton label="Start Workout" onPress={() => router.push('/start')} /></View>
    <SectionHeader>Quick access</SectionHeader>
    <Pressable onPress={() => router.push('/exercises')} style={styles.linkCard}>
      <View style={styles.linkIcon}><Ionicons name="barbell-outline" size={24} color={colors.accent} /></View>
      <View style={styles.linkText}><Text style={styles.linkTitle}>Exercise Library</Text>
        <Text style={styles.linkCopy}>Browse 100+ exercises or create your own</Text></View>
      <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
    </Pressable>
    <SectionHeader>This week</SectionHeader>
    <View style={styles.stats}><View style={styles.stat}><Text style={styles.statValue}>0</Text><Text style={styles.statLabel}>Workouts</Text></View>
      <View style={styles.stat}><Text style={styles.statValue}>0m</Text><Text style={styles.statLabel}>Training</Text></View>
      <View style={styles.stat}><Text style={styles.statValue}>—</Text><Text style={styles.statLabel}>Streak</Text></View></View>
    {settings.showBodyProgressHome&&profile?<><SectionHeader>Body Progress</SectionHeader><Pressable accessibilityRole="button" accessibilityLabel="Open Body Progress" onPress={()=>router.push('/body')} style={styles.linkCard}><View style={styles.linkIcon}><Ionicons name="body-outline" size={24} color={colors.accent}/></View><View style={styles.linkText}><Text style={styles.linkTitle}>{profile.currentWeightKg==null?'Add your first weight':`${kilogramsToDisplay(profile.currentWeightKg,settings.weightUnit).toFixed(1)} ${settings.weightUnit}`}</Text><Text style={styles.linkCopy}>{latestMeasurement?`Last measurements ${new Date(latestMeasurement.measuredAt).toLocaleDateString()}`:'Record body measurements to compare changes'}</Text></View><Ionicons name="chevron-forward" size={22} color={colors.textMuted}/></Pressable></>:null}
    {recentRecords.length > 0 && <>
      <SectionHeader>Recent Records</SectionHeader>
      <View style={styles.records}>
        {recentRecords.map((record) => <PersonalRecordCard key={record.id} record={{ ...record, previousValue: null }}
          onPress={() => router.push({ pathname: '/workout/[id]', params: { id: record.workoutId } })} />)}
      </View>
    </>}
  </AppScreen>;
}
const styles = StyleSheet.create({ top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.lg, marginBottom: spacing.xl },
  eyebrow: { ...typography.label, color: colors.accent, textTransform: 'uppercase' }, title: { ...typography.title, color: colors.text, marginTop: 2 },
  tagline: { ...typography.body, color: colors.textMuted }, settings: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 24 },
  hero: { padding: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, gap: spacing.md, marginBottom: spacing.xl },
  heroTitle: { ...typography.heading, color: colors.text }, heroCopy: { ...typography.body, color: colors.textMuted },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, marginTop: spacing.md, marginBottom: spacing.xl, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  linkIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#143622', alignItems: 'center', justifyContent: 'center' }, linkText: { flex: 1 },
  linkTitle: { ...typography.body, color: colors.text, fontWeight: '700' }, linkCopy: { ...typography.caption, color: colors.textMuted, marginTop: 3 },
  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }, stat: { flex: 1, padding: spacing.lg, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md },
  statValue: { ...typography.heading, color: colors.text }, statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
  records: { gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.xl } });
