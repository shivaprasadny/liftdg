import { router, useFocusEffect } from 'expo-router'; import { useCallback, useEffect, useState } from 'react'; import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { AppButton } from '@/components/AppButton'; import { AppScreen } from '@/components/AppScreen'; import { Header } from '@/components/Header'; import { PlanEmptyState } from '@/components/PlanEmptyState'; import { SearchBar } from '@/components/SearchBar'; import { SectionHeader } from '@/components/SectionHeader'; import { WorkoutPlanCard } from '@/components/WorkoutPlanCard';
import { colors } from '@/constants/colors'; import { spacing } from '@/constants/spacing'; import { usePlanDraft } from '@/contexts/PlanDraftContext'; import { useDatabase } from '@/hooks/useDatabase'; import { getBuiltInPlans, getUserPlans } from '@/repositories/workoutPlanRepository'; import type { WorkoutPlan } from '@/types/workoutPlan';
export default function PlansScreen() {
  const db = useDatabase(); const { reset } = usePlanDraft(); const [search, setSearch] = useState(''); const [mine, setMine] = useState<WorkoutPlan[]>([]); const [starters, setStarters] = useState<WorkoutPlan[]>([]); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { const [userPlans, builtIns] = await Promise.all([getUserPlans(db, search), getBuiltInPlans(db, search)]); setMine(userPlans); setStarters(builtIns); } finally { setLoading(false); } }, [db, search]);
  useFocusEffect(useCallback(() => { void load(); }, [load])); useEffect(() => { const timer = setTimeout(() => void load(), 180); return () => clearTimeout(timer); }, [load]);
  const open = (plan: WorkoutPlan) => router.push({ pathname: '/plans/[id]', params: { id: plan.id } });
  return <AppScreen header={<Header title="Training" action={<AppButton label="New Plan" onPress={() => { reset(); router.push('/plans/create'); }} />} />}>
    <SearchBar value={search} onChangeText={setSearch} /><View style={styles.row}><AppButton label="Calendar" variant="secondary" onPress={() => router.push('/calendar')} style={styles.rowButton} /><AppButton label="Programs" variant="secondary" onPress={() => router.push('/programs')} style={styles.rowButton} /></View>{loading ? <ActivityIndicator style={styles.loader} size="large" color={colors.accent} /> : <ScrollView contentContainerStyle={styles.content}>
      <SectionHeader>My Plans</SectionHeader>{mine.length ? mine.map((plan) => <WorkoutPlanCard key={plan.id} plan={plan} onPress={() => open(plan)} />) : <PlanEmptyState />}
      <SectionHeader>Starter Plans</SectionHeader>{starters.length ? starters.map((plan) => <WorkoutPlanCard key={plan.id} plan={plan} onPress={() => open(plan)} />) : <PlanEmptyState starter />}
      <SectionHeader>Recently Used</SectionHeader>{[...mine, ...starters].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3).map((plan) => <WorkoutPlanCard key={`recent-${plan.id}`} plan={plan} onPress={() => open(plan)} />)}
    </ScrollView>}
  </AppScreen>;
}
const styles = StyleSheet.create({ loader: { flex: 1 }, content: { paddingVertical: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md }, row: { flexDirection: 'row', gap: spacing.sm }, rowButton: { flex: 1 } });
