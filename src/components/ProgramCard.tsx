import { Pressable, StyleSheet, Text, View } from 'react-native';

import { programDifficultyLabels } from '@/constants/programDifficulty';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { formatProgramLength } from '@/services/programService';
import type { ProgramTemplate } from '@/types/program';

export function ProgramCard({ program, onPress }: { program: ProgramTemplate; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
    <View style={styles.head}>
      <Text style={styles.name} numberOfLines={2}>{program.name}</Text>
      {program.isFeatured && <Text style={styles.featured}>FEATURED</Text>}
    </View>
    {program.category ? <Text style={styles.category}>{program.category}</Text> : null}
    {program.description ? <Text numberOfLines={2} style={styles.description}>{program.description}</Text> : null}
    <Text style={styles.meta}>{formatProgramLength(program)} · {programDifficultyLabels[program.difficulty]}
      {program.estimatedSessionMinutes ? ` · ~${program.estimatedSessionMinutes} min/session` : ''}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.sm },
  pressed: { opacity: 0.72 },
  head: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  name: { ...typography.body, color: colors.text, fontWeight: '800', flex: 1 },
  featured: { fontSize: 10, color: colors.accent, fontWeight: '800' },
  category: { ...typography.label, color: colors.accent },
  description: { ...typography.caption, color: colors.textMuted },
  meta: { ...typography.caption, color: colors.text },
});
