import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SearchBar } from '@/components/SearchBar';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import type { Exercise } from '@/types/exercise';

interface Props {
  exercises: Exercise[];
  recentExerciseIds: string[];
  mostTrainedExerciseIds: string[];
  selectedExerciseId: string | null;
  onSelect: (exerciseId: string) => void;
}

function Row({ exercise, selected, onPress }: { exercise: Exercise; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
      style={({ pressed }) => [styles.row, selected && styles.rowSelected, pressed && styles.pressed]}>
      <Text style={[styles.rowText, selected && styles.rowTextSelected]}>{exercise.name}</Text>
    </Pressable>
  );
}

/** Search over the full library; when idle, surfaces recently- and most-trained exercises first. */
export function ExerciseProgressSelector({ exercises, recentExerciseIds, mostTrainedExerciseIds, selectedExerciseId, onSelect }: Props) {
  const [search, setSearch] = useState('');
  const byId = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, exercise])), [exercises]);

  const term = search.trim().toLocaleLowerCase();
  const results = term ? exercises.filter((exercise) => exercise.name.toLocaleLowerCase().includes(term)) : null;
  const recent = recentExerciseIds.map((id) => byId.get(id)).filter((exercise): exercise is Exercise => Boolean(exercise));
  const mostTrained = mostTrainedExerciseIds.map((id) => byId.get(id)).filter((exercise): exercise is Exercise => Boolean(exercise));

  return (
    <View style={styles.container}>
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search exercises" />
      {results ? (
        <Section title="Results">
          {results.length === 0 ? <Text style={styles.empty}>No exercises match &ldquo;{search}&rdquo;.</Text>
            : results.map((exercise) => <Row key={exercise.id} exercise={exercise} selected={exercise.id === selectedExerciseId} onPress={() => onSelect(exercise.id)} />)}
        </Section>
      ) : (
        <>
          {recent.length > 0 && (
            <Section title="Recently Trained">
              {recent.map((exercise) => <Row key={exercise.id} exercise={exercise} selected={exercise.id === selectedExerciseId} onPress={() => onSelect(exercise.id)} />)}
            </Section>
          )}
          {mostTrained.length > 0 && (
            <Section title="Most Trained">
              {mostTrained.map((exercise) => <Row key={exercise.id} exercise={exercise} selected={exercise.id === selectedExerciseId} onPress={() => onSelect(exercise.id)} />)}
            </Section>
          )}
        </>
      )}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.sectionBody}>{children}</View></View>;
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  section: { gap: spacing.xs },
  sectionTitle: { ...typography.label, color: colors.textMuted },
  sectionBody: { gap: spacing.xs },
  row: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  rowSelected: { borderColor: colors.accent, backgroundColor: colors.surfaceElevated },
  pressed: { opacity: 0.75 },
  rowText: { ...typography.body, color: colors.text },
  rowTextSelected: { color: colors.accent, fontWeight: '700' },
  empty: { ...typography.body, color: colors.textMuted },
});
