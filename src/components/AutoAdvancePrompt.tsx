import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from './AppButton';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

export function AutoAdvancePrompt({ nextName, onCancel, onAdvance }: { nextName: string; onCancel: () => void; onAdvance: () => void }) {
  const [remaining, setRemaining] = useState(3);
  useEffect(() => {
    const interval = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    const timeout = setTimeout(onAdvance, 3000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [onAdvance]);
  return <View accessibilityRole="alert" accessibilityLabel={`Exercise complete. Next exercise ${nextName} in ${remaining} seconds`} style={styles.card}>
    <Text style={styles.title}>✓ Exercise complete</Text><Text style={styles.text}>Next: {nextName} in {remaining} seconds</Text>
    <View style={styles.row}><AppButton label="Stay Here" variant="secondary" onPress={onCancel} style={styles.button}/><AppButton label="Go Now" onPress={onAdvance} style={styles.button}/></View>
  </View>;
}
const styles = StyleSheet.create({ card: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.accent, backgroundColor: colors.surface, gap: spacing.sm }, title: { ...typography.label, color: colors.accent }, text: { ...typography.body, color: colors.text }, row: { flexDirection: 'row', gap: spacing.sm }, button: { flex: 1 } });
