import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';

import { spacing } from '@/constants/spacing';
import { useAppColors } from '@/hooks/useAppColors';

interface Props { count: number; activeIndex: number; labels: string[]; onSelect?: (index: number) => void; }

function Dot({ active, onPress, reduceMotion }: { active: boolean; onPress?: () => void; reduceMotion: boolean }) {
  const colors = useAppColors();
  const style = useAnimatedStyle(() => ({
    width: reduceMotion ? (active ? 18 : 8) : withTiming(active ? 18 : 8, { duration: 200 }),
    backgroundColor: withTiming(active ? colors.accent : colors.border, { duration: 200 }),
  }), [active, colors, reduceMotion]);
  const dot = <Animated.View style={[styles.dot, style]} />;
  return onPress ? <Pressable accessibilityRole="button" hitSlop={8} onPress={onPress}>{dot}</Pressable> : dot;
}

/** Dots alone never carry the page identity — each also gets a "Page X of Y, {label}" accessibility label. */
export function HydrationPaginationDots({ count, activeIndex, labels, onSelect }: Props) {
  const reduceMotion = useReducedMotion();
  return (
    <View accessibilityRole="tablist" style={styles.row}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} accessible accessibilityLabel={`Page ${index + 1} of ${count}, ${labels[index]}`} accessibilityState={{ selected: index === activeIndex }}>
          <Dot active={index === activeIndex} onPress={onSelect ? () => onSelect(index) : undefined} reduceMotion={reduceMotion} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  dot: { height: 8, borderRadius: 4 },
});
