import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppColors } from '@/hooks/useAppColors';

interface Props {
  label: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isCurrent: boolean;
  onBack: () => void;
  onForward: () => void;
  onToday: () => void;
  onPressTitle: () => void;
}

export function HydrationDateNavigator({ label, canGoBack, canGoForward, isCurrent, onBack, onForward, onToday, onPressTitle }: Props) {
  const colors = useAppColors();
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous period" disabled={!canGoBack} onPress={onBack} hitSlop={8} style={[styles.arrow, !canGoBack && styles.disabled]}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`${label}. Tap to choose a specific period.`} onPress={onPressTitle} style={styles.titleButton}>
          <Text style={[styles.title, { color: colors.text }]}>{label}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Next period" disabled={!canGoForward} onPress={onForward} hitSlop={8} style={[styles.arrow, !canGoForward && styles.disabled]}>
          <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
      </View>
      {!isCurrent && (
        <Pressable accessibilityRole="button" onPress={onToday} style={[styles.todayButton, { borderColor: colors.accent }]}>
          <Text style={[styles.todayText, { color: colors.accent }]}>Today</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  arrow: { padding: spacing.xs }, disabled: { opacity: 0.3 },
  titleButton: { paddingHorizontal: spacing.sm },
  title: { ...typography.heading },
  todayButton: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1 },
  todayText: { ...typography.caption, fontWeight: '700' },
});
