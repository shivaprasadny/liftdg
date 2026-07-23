import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppColors } from '@/hooks/useAppColors';

export type TrainingSection = 'calendar' | 'mine' | 'starters' | 'programs';

const sections: { key: TrainingSection; label: string }[] = [
  { key: 'calendar', label: 'Calendar' },
  { key: 'mine', label: 'My Workouts' },
  { key: 'starters', label: 'Starter Plans' },
  { key: 'programs', label: 'Programs' },
];

export function TrainingNavigation({ selected }: { selected: TrainingSection }) {
  const colors = useAppColors();
  const open = (section: TrainingSection) => {
    if (section === 'calendar') router.replace('/(tabs)/plans');
    else if (section === 'programs') router.push('/programs');
    else router.replace({ pathname: '/(tabs)/plans', params: { view: section } });
  };

  return <View style={styles.wrap}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
      {sections.map((section) => {
        const active = section.key === selected;
        return <Pressable key={section.key} accessibilityRole="tab" accessibilityState={{ selected: active }}
          accessibilityLabel={`${section.label} training section`} onPress={() => open(section.key)}
          style={[styles.tab, { backgroundColor: active ? colors.accent : colors.surface, borderColor: active ? colors.accent : colors.border }]}>
          <Text style={[styles.label, { color: active ? colors.accentText : colors.text }]}>{section.label}</Text>
        </Pressable>;
      })}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { minHeight: 52 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  tab: { minHeight: 42, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.label, fontWeight: '800' },
});
