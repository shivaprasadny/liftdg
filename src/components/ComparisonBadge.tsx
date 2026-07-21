import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';
import type { ComparisonValue } from '@/types/statistics';

/** Renders nothing when there is no previous-period data, instead of a misleading 0%/∞%. */
export function ComparisonBadge({ comparison, label }: { comparison: ComparisonValue; label: string }) {
  if (comparison.percentChange === null) return null;
  const positive = comparison.percentChange >= 0;
  const text = `${positive ? '+' : ''}${comparison.percentChange}% ${label}`;
  return (
    <View style={styles.row} accessibilityLabel={text}>
      <Ionicons name={positive ? 'arrow-up' : 'arrow-down'} size={12} color={positive ? colors.accent : colors.warning} />
      <Text style={[styles.text, { color: positive ? colors.accent : colors.warning }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  text: { ...typography.caption, fontWeight: '700' },
});
