import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { ExerciseCard } from '@/components/ExerciseCard';
import { FilterChip } from '@/components/FilterChip';
import { SearchBar } from '@/components/SearchBar';
import { colors } from '@/constants/colors';
import { equipmentTypes, type EquipmentType } from '@/constants/equipmentTypes';
import { exerciseCategories, type ExerciseCategory } from '@/constants/exerciseCategories';
import { radius, spacing } from '@/constants/spacing';
import { useDatabase } from '@/hooks/useDatabase';
import { listExercises } from '@/repositories/exerciseRepository';
import { exerciseTypes, type Exercise, type ExerciseType } from '@/types/exercise';
import { getUserMessage } from '@/utils/errors';

export default function ExerciseLibraryScreen() {
  const db = useDatabase();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>();
  const [equipment, setEquipment] = useState<EquipmentType>();
  const [type, setType] = useState<ExerciseType>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    try {
      setError(undefined);
      setExercises(await listExercises(db, { search, category, equipment, exerciseType: type }));
    } catch (caught) { setError(getUserMessage(caught, 'Could not load the exercise library.')); }
    finally { setLoading(false); }
  }, [category, db, equipment, search, type]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => { const timer = setTimeout(() => { void load(); }, 180); return () => clearTimeout(timer); }, [load]);
  const filtersActive = Boolean(category || equipment || type);
  const emptyMessage = useMemo(() => search || filtersActive ? 'Try clearing search or filters.' : 'Create your first custom exercise.', [filtersActive, search]);

  return <View style={styles.screen}>
    <View style={styles.controls}>
      <View style={styles.searchRow}><View style={styles.search}><SearchBar value={search} onChangeText={setSearch} /></View>
        <Pressable accessibilityLabel="Create custom exercise" onPress={() => router.push('/exercises/create')} style={styles.add}>
          <Ionicons name="add" size={28} color={colors.accentText} /></Pressable></View>
      <Text style={styles.filterLabel}>MUSCLE GROUP</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <FilterChip label="All" selected={!category} onPress={() => setCategory(undefined)} />
        {exerciseCategories.map((item) => <FilterChip key={item} label={item} selected={category === item} onPress={() => setCategory(item)} />)}
      </ScrollView>
      <Text style={styles.filterLabel}>EQUIPMENT</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <FilterChip label="All" selected={!equipment} onPress={() => setEquipment(undefined)} />
        {equipmentTypes.map((item) => <FilterChip key={item} label={item} selected={equipment === item} onPress={() => setEquipment(item)} />)}
      </ScrollView>
      <Text style={styles.filterLabel}>TYPE</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <FilterChip label="All" selected={!type} onPress={() => setType(undefined)} />
        {exerciseTypes.map((item) => <FilterChip key={item} label={item[0].toUpperCase() + item.slice(1)} selected={type === item} onPress={() => setType(item)} />)}
      </ScrollView>
      <View style={styles.resultRow}><Text style={styles.results}>{exercises.length} exercises</Text>
        {filtersActive && <Pressable onPress={() => { setCategory(undefined); setEquipment(undefined); setType(undefined); }}><Text style={styles.clear}>Clear filters</Text></Pressable>}</View>
    </View>
    {loading ? <ActivityIndicator style={styles.loader} size="large" color={colors.accent} />
      : error ? <EmptyState title="Exercise library unavailable" message={error} />
      : <FlatList data={exercises} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled" ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => <ExerciseCard exercise={item} onPress={() => router.push({ pathname: '/exercises/[id]', params: { id: item.id } })} />}
        ListEmptyComponent={<EmptyState title="No exercises found" message={emptyMessage} />} />}
  </View>;
}

const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background }, controls: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  searchRow: { flexDirection: 'row', gap: spacing.sm }, search: { flex: 1 }, add: { width: 50, height: 50, borderRadius: radius.md, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  filterLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700', letterSpacing: 1, marginTop: spacing.xs }, chips: { gap: spacing.sm, paddingRight: spacing.lg },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm }, results: { fontSize: 13, color: colors.textMuted }, clear: { fontSize: 13, color: colors.accent, fontWeight: '600' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 }, separator: { height: spacing.sm }, loader: { flex: 1 } });
