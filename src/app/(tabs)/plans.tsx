import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlanEmptyState } from '@/components/PlanEmptyState';
import { SearchBar } from '@/components/SearchBar';
import { TrainingNavigation, type TrainingSection } from '@/components/TrainingNavigation';
import { WorkoutPlanCard } from '@/components/WorkoutPlanCard';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { usePlanDraft } from '@/contexts/PlanDraftContext';
import { useAppColors } from '@/hooks/useAppColors';
import { useDatabase } from '@/hooks/useDatabase';
import { getBuiltInPlans, getUserPlans } from '@/repositories/workoutPlanRepository';
import type { WorkoutPlan } from '@/types/workoutPlan';

import CalendarScreen from '../calendar/index';

export default function PlansScreen() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  if (view !== 'mine' && view !== 'starters') return <CalendarScreen embeddedInTab />;
  return <WorkoutLibrary section={view} />;
}

function WorkoutLibrary({ section }: { section: Extract<TrainingSection, 'mine' | 'starters'> }) {
  const db = useDatabase();
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const { reset } = usePlanDraft();
  const [search, setSearch] = useState('');
  const [plans, setPlans] = useState<WorkoutPlan[]>();

  const load = useCallback(async () => {
    const result = section === 'mine' ? await getUserPlans(db, search) : await getBuiltInPlans(db, search);
    setPlans(result);
  }, [db, search, section]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => { const timer = setTimeout(() => void load(), 220); return () => clearTimeout(timer); }, [load]);

  const createWorkout = () => { reset(); router.push('/plans/create'); };
  const title = section === 'mine' ? 'My Workouts' : 'Starter Plans';
  const subtitle = section === 'mine' ? 'Your reusable training sessions, ready whenever you are.' : 'Proven starting points you can preview and duplicate.';

  return <View style={[styles.screen, { backgroundColor: colors.background }]}>
    <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
      <TrainingNavigation selected={section} />
      <View style={styles.hero}>
        <View style={styles.flex}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>{section === 'mine' ? 'YOUR LIBRARY' : 'LIFTDG COLLECTION'}</Text>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
        </View>
        {section === 'mine' ? <Pressable accessibilityRole="button" accessibilityLabel="Create new workout"
          style={[styles.addButton, { backgroundColor: colors.accent }]} onPress={createWorkout}>
          <Ionicons name="add" size={28} color={colors.accentText} />
        </Pressable> : null}
      </View>
      <View style={styles.search}><SearchBar value={search} onChangeText={setSearch} placeholder={`Search ${title.toLowerCase()}…`} /></View>
    </View>
    {plans === undefined ? <ActivityIndicator style={styles.loader} size="large" color={colors.accent} /> : <FlatList
      data={plans}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      ListEmptyComponent={<PlanEmptyState starter={section === 'starters'} />}
      renderItem={({ item }) => <WorkoutPlanCard plan={item} onPress={() => router.push({ pathname: '/plans/[id]', params: { id: item.id } })} />}
    />}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, top: { paddingBottom: spacing.md, gap: spacing.md }, hero: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.lg, gap: spacing.md },
  flex: { flex: 1 }, eyebrow: { ...typography.caption, fontWeight: '900', letterSpacing: 1.3 }, title: { ...typography.title, fontSize: 28 }, subtitle: { ...typography.caption, lineHeight: 18 },
  addButton: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, search: { paddingHorizontal: spacing.lg },
  loader: { flex: 1 }, list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl, flexGrow: 1 },
});
