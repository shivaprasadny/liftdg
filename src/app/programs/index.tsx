import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ProgramCard } from '@/components/ProgramCard';
import { SectionHeader } from '@/components/SectionHeader';
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
  const featured = programs?.filter((program) => program.isFeatured) ?? [];
  const rest = programs?.filter((program) => !program.isFeatured) ?? [];

  return <View style={styles.screen}>
    {programs === undefined ? <ActivityIndicator style={styles.loader} size="large" color={colors.accent} />
      : programs.length === 0 ? <EmptyState title="No programs yet" message="Multi-week training programs will appear here." />
      : <ScrollView contentContainerStyle={styles.content}>
        {featured.length > 0 && <View style={styles.section}>
          <SectionHeader>Shiva&rsquo;s Favorites</SectionHeader>
          {featured.map((program) => <ProgramCard key={program.id} program={program} onPress={() => open(program)} />)}
        </View>}
        {rest.length > 0 && <View style={styles.section}>
          <SectionHeader>Built-in Programs</SectionHeader>
          {rest.map((program) => <ProgramCard key={program.id} program={program} onPress={() => open(program)} />)}
        </View>}
      </ScrollView>}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1 }, content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  section: { gap: spacing.sm },
});
