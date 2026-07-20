import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppScreen } from '@/components/AppScreen';
import { SectionHeader } from '@/components/SectionHeader';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

function greeting(): string { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }

export default function HomeScreen() {
  return <AppScreen scroll>
    <View style={styles.top}><View><Text style={styles.eyebrow}>{format(new Date(), 'EEEE, MMMM d')}</Text>
      <Text style={styles.title}>{greeting()}</Text><Text style={styles.tagline}>Track Every Rep</Text></View>
      <Pressable accessibilityLabel="Settings" onPress={() => Alert.alert('Settings', 'Settings will be added in a later phase.')} style={styles.settings}><Ionicons name="settings-outline" size={23} color={colors.text} /></Pressable></View>
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
  statValue: { ...typography.heading, color: colors.text }, statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 4 } });
