import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';

import { radius } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppColors } from '@/hooks/useAppColors';

interface Props { percent: number; atGoal: boolean; }

/** Fill never exceeds 100% width; an over-goal percentage is shown as text above the bar instead. */
export function HydrationProgressBar({ percent, atGoal }: Props) {
  const colors = useAppColors();
  const reduceMotion = useReducedMotion();
  const clamped = Math.min(100, Math.max(0, percent));
  const fillStyle = useAnimatedStyle(() => ({
    width: reduceMotion ? `${clamped}%` : withTiming(`${clamped}%`, { duration: 450 }),
    backgroundColor: withTiming(atGoal ? colors.success : colors.accent, { duration: 450 }),
  }), [clamped, atGoal, colors, reduceMotion]);

  return (
    <View>
      {percent > 100 && <Text style={[styles.overGoal, { color: colors.success }]}>{percent}%</Text>}
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: clamped }}
        style={[styles.track, { backgroundColor: colors.surfaceElevated }]}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overGoal: { ...typography.caption, fontWeight: '700', textAlign: 'right', marginBottom: 2 },
  track: { height: 14, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
});
