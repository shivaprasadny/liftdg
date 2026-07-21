import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';

import { spacing } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';

interface Props { expanded: boolean; onPress: () => void; }

export function HydrationArrow({ expanded, onPress }: Props) {
  const colors = useAppColors();
  const reduceMotion = useReducedMotion();
  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: reduceMotion ? (expanded ? '180deg' : '0deg') : withTiming(expanded ? '180deg' : '0deg', { duration: 250 }) }],
  }), [expanded, reduceMotion]);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Collapse water statistics' : 'Show more water statistics'}
      hitSlop={12} onPress={onPress} style={styles.button}>
      <Animated.View style={rotateStyle}>
        <Ionicons name="chevron-down" size={22} color={colors.textMuted} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({ button: { alignItems: 'center', paddingVertical: spacing.xs } });
