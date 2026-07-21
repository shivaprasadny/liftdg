import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming,
} from 'react-native-reanimated';

import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppColors } from '@/hooks/useAppColors';
import type { HydrationCelebrationStyle } from '@/types/settings';

const PARTICLES = ['💧', '🎉', '✨', '💧', '🎉', '✨', '💧', '✨'];

function Particle({ index, active, reduceMotion }: { index: number; active: boolean; reduceMotion: boolean }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    if (!active) { progress.value = 0; return; }
    progress.value = reduceMotion ? 1 : withDelay(index * 60, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [active, index, progress, reduceMotion]);
  const angle = (index / PARTICLES.length) * Math.PI * 2;
  const style = useAnimatedStyle(() => ({
    opacity: reduceMotion ? (active ? 1 : 0) : 1 - progress.value,
    transform: [
      { translateX: Math.cos(angle) * 60 * progress.value },
      { translateY: Math.sin(angle) * 60 * progress.value - progress.value * 30 },
      { scale: reduceMotion ? 1 : 0.6 + progress.value * 0.8 },
    ],
  }));
  return <Animated.Text style={[styles.particle, style]}>{PARTICLES[index % PARTICLES.length]}</Animated.Text>;
}

interface Props { visible: boolean; celebrationStyle: HydrationCelebrationStyle; }

/** Renders nothing for `off`; callers should only mount this once per day the goal is first met. */
export function HydrationCelebration({ visible, celebrationStyle }: Props) {
  const colors = useAppColors();
  const reduceMotion = useReducedMotion();
  const checkScale = useSharedValue(0);

  useEffect(() => {
    if (!visible || celebrationStyle === 'off') return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    checkScale.value = reduceMotion ? 1 : withTiming(1, { duration: 350, easing: Easing.out(Easing.back(1.6)) });
  }, [visible, celebrationStyle, reduceMotion, checkScale]);

  const checkStyle = useAnimatedStyle(() => ({ transform: [{ scale: checkScale.value }] }));
  if (!visible || celebrationStyle === 'off') return null;

  return (
    <View accessibilityLiveRegion="polite" accessibilityLabel="Goal completed. Great job, you reached today's hydration goal." style={styles.container}>
      {celebrationStyle === 'full' && PARTICLES.map((_, index) => <Particle key={index} index={index} active={visible} reduceMotion={reduceMotion} />)}
      <Animated.View style={checkStyle}><Ionicons name="checkmark-circle" size={40} color={colors.success} /></Animated.View>
      <Text style={[styles.text, { color: colors.success }]}>Goal completed!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  particle: { position: 'absolute', fontSize: 20 },
  text: { ...typography.label, fontWeight: '700' },
});
