import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState } from '@/components/EmptyState';
import { ProgramCard } from '@/components/ProgramCard';
import { SectionHeader } from '@/components/SectionHeader';
import { TrainingNavigation } from '@/components/TrainingNavigation';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useDatabase } from '@/hooks/useDatabase';
import { getAllPrograms } from '@/repositories/programRepository';
import type { ProgramTemplate } from '@/types/program';

/** Read-only list for now (DECISIONS.md #45) — no create/duplicate/favorite actions until the editor exists. */
export default function ProgramsScreen() {
  const db = useDatabase();
  const [programs, setPrograms] = useState<ProgramTemplate[]>();
  const load = useCallback(() => { void getAllPrograms(db).then(setPrograms); }, [db]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const open = (program: ProgramTemplate) => router.push({ pathname: '/programs/[id]', params: { id: program.id } });
  const groups: { category: string; programs: ProgramTemplate[] }[] = [];
  for (const program of programs ?? []) {
    const category = program.category ?? 'Programs';
    const group = groups.find((entry) => entry.category === category);
    if (group) group.programs.push(program); else groups.push({ category, programs: [program] });
  }

  return <View style={styles.screen}>
    {programs === undefined ? <ActivityIndicator style={styles.loader} size="large" color={colors.accent} />
      : programs.length === 0 ? <EmptyState title="No programs yet" message="Multi-week training programs will appear here." />
      : <ScrollView contentContainerStyle={styles.content}>
        <TrainingNavigation selected="programs" />
        <View style={styles.programHeader}><View style={styles.flex}><SectionHeader>Programs</SectionHeader></View><Pressable accessibilityRole="button" accessibilityLabel="Create custom program" onPress={() => router.push('/programs/create')} style={styles.addButton}><Ionicons name="add" size={28} color={colors.accentText} /></Pressable></View>
        {groups.map((group) => <View key={group.category} style={styles.section}>
          <SectionHeader>{group.category}</SectionHeader>
          {group.programs.map((program) => <ProgramCard key={program.id} program={program} onPress={() => open(program)} />)}
        </View>)}
      </ScrollView>}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1 }, content: { paddingVertical: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  section: { gap: spacing.sm, marginHorizontal: spacing.lg },
  programHeader: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg }, flex: { flex: 1 },
  addButton: { width: 50, height: 50, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});
