import { Text } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import { typography } from '@/constants/typography';
import { useAppColors } from '@/hooks/useAppColors';

export function HydrationMilestoneMessage({ message }: { message: string }) {
  const colors = useAppColors();
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View key={message} entering={reduceMotion ? undefined : FadeIn.duration(300)}>
      <Text style={[typography.body, { color: colors.textMuted }]}>{message}</Text>
    </Animated.View>
  );
}
