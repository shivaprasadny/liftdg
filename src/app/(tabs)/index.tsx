import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppScreen } from '@/components/AppScreen';
import { HydrationCard } from '@/components/HydrationCard';
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
function greetingEmoji(): string { const h = new Date().getHours(); return h < 12 ? '☀️' : h < 18 ? '👋' : '🌙'; }

export default function HomeScreen() {
  const db = useDatabase();
  const { settings } = useSettings();
  const [recentRecords, setRecentRecords] = useState<PersonalRecord[]>([]);
  const [profile,setProfile]=useState<UserProfile|null>(); const[latestMeasurement,setLatestMeasurement]=useState<BodyMeasurementEntry|null>();
  useFocusEffect(useCallback(() => { void Promise.all([getRecentPersonalRecords(db,3),getProfile(db),getLatestMeasurementEntry(db)]).then(([records,nextProfile,entry])=>{setRecentRecords(records);setProfile(nextProfile);setLatestMeasurement(entry)}); }, [db]));

  return <AppScreen scroll>
    <View style={styles.top}>
      <View style={styles.greetingCopy}><View style={styles.datePill}><Text style={styles.eyebrow}>{format(new Date(), 'EEEE, MMMM d')}</Text></View>
        <Text style={styles.title}>{greetingEmoji()} {greeting()}{profile?.name?`, ${profile.name}`:''}</Text><Text style={styles.tagline}>Track Every Rep</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Open settings" onPress={() => router.push('/settings')} style={({pressed})=>[styles.settings,pressed&&styles.pressed]}><Ionicons name="settings-outline" size={23} color={colors.text} /></Pressable></View>
    {settings.showBodyProgressHome&&profile?<Pressable accessibilityRole="button" accessibilityLabel="Open Body Progress" onPress={()=>router.push('/body')} style={({pressed})=>[styles.bodyHero,pressed&&styles.pressed]}>
      <View style={styles.bodyHeroTop}><View style={styles.bodyIcon}><Text style={styles.bodyEmoji}>📊</Text></View><View style={styles.linkText}><Text style={styles.bodyEyebrow}>BODY PROGRESS</Text><Text style={styles.bodyWeight}>{profile.currentWeightKg==null?'Add your first weight':`${kilogramsToDisplay(profile.currentWeightKg,settings.weightUnit).toFixed(1)} ${settings.weightUnit}`}</Text></View><Ionicons name="chevron-forward" size={24} color={colors.accent}/></View>
      <Text style={styles.bodyCopy}>{latestMeasurement?`Last measurements ${new Date(latestMeasurement.measuredAt).toLocaleDateString()}`:'Track weight and measurements over time'}</Text>
      <View style={styles.bodyAction}><Ionicons name="add-circle" size={20} color={colors.accent}/><Text style={styles.bodyActionText}>Add weight or measurements</Text></View>
    </Pressable>:null}
    <HydrationCard />
    <SectionHeader>⚡ Quick access</SectionHeader>
    <Pressable accessibilityRole="button" accessibilityLabel="Open Exercise Library" onPress={() => router.push('/exercises')} style={({pressed})=>[styles.linkCard,pressed&&styles.pressed]}>
      <View style={styles.linkIcon}><Text style={styles.quickEmoji}>🏋️</Text></View>
      <View style={styles.linkText}><Text style={styles.linkTitle}>Exercise Library</Text>
        <Text style={styles.linkCopy}>Browse 100+ exercises or create your own</Text><Text style={styles.linkAction}>Explore exercises →</Text></View>
    </Pressable>
    <SectionHeader>📅 This week</SectionHeader>
    <View style={styles.stats}>
      <View style={styles.stat}><Text style={styles.statEmoji}>💪</Text><Text style={styles.statValue}>0</Text><Text style={styles.statLabel}>Workouts</Text></View>
      <View style={styles.stat}><Text style={styles.statEmoji}>⏱️</Text><Text style={styles.statValue}>0m</Text><Text style={styles.statLabel}>Training</Text></View>
      <View style={styles.stat}><Text style={styles.statEmoji}>🔥</Text><Text style={styles.statValue}>—</Text><Text style={styles.statLabel}>Streak</Text></View>
    </View>
    {recentRecords.length > 0 && <>
      <SectionHeader>🏆 Recent Records</SectionHeader>
      <View style={styles.records}>
        {recentRecords.map((record) => <PersonalRecordCard key={record.id} record={{ ...record, previousValue: null }}
          onPress={() => router.push({ pathname: '/workout/[id]', params: { id: record.workoutId } })} />)}
      </View>
    </>}
  </AppScreen>;
}
const styles = StyleSheet.create({ top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, paddingTop: spacing.lg, marginBottom: spacing.xl }, greetingCopy: { flex: 1, gap: spacing.xs },
  datePill: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.pill, backgroundColor: '#10291B' }, eyebrow: { ...typography.caption, color: colors.accent, fontWeight: '800', textTransform: 'uppercase', letterSpacing: .5 }, title: { ...typography.title, color: colors.text, marginTop: spacing.xs, fontSize: 28 },
  tagline: { ...typography.body, color: colors.textMuted }, settings: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 25, borderWidth: 1, borderColor: colors.border },
  bodyHero: { padding: spacing.lg, backgroundColor: '#10291B', borderRadius: radius.lg, borderWidth: 1, borderColor: '#23623A', gap: spacing.sm, marginBottom: spacing.lg },
  bodyHeroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, bodyIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#173D27' }, bodyEmoji: { fontSize: 24 },
  bodyEyebrow: { ...typography.caption, color: colors.accent, fontWeight: '900', letterSpacing: 1 }, bodyWeight: { ...typography.heading, color: colors.text, fontSize: 22, marginTop: 2 }, bodyCopy: { ...typography.caption, color: '#B9D8C4' },
  bodyAction: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.xs }, bodyActionText: { ...typography.label, color: colors.text }, pressed: { opacity: 0.76, transform: [{ scale: .99 }] },
  linkCard: { minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg, marginTop: spacing.md, marginBottom: spacing.xl, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  linkIcon: { width: 58, height: 58, borderRadius: radius.lg, backgroundColor: '#143622', alignItems: 'center', justifyContent: 'center' }, quickEmoji: { fontSize: 28 }, linkText: { flex: 1 },
  linkTitle: { ...typography.heading, color: colors.text, fontSize: 19 }, linkCopy: { ...typography.caption, color: colors.textMuted, marginTop: 3 }, linkAction: { ...typography.label, color: colors.accent, marginTop: spacing.sm },
  stats: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.xl }, stat: { flex: 1, minHeight: 126, paddingVertical: spacing.lg, paddingHorizontal: spacing.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border }, statEmoji: { fontSize: 21, marginBottom: spacing.sm },
  statValue: { ...typography.heading, color: colors.text, fontSize: 24 }, statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
  records: { gap: spacing.sm, marginTop: spacing.md, marginBottom: spacing.xl } });
