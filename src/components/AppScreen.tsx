import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

interface Props extends PropsWithChildren {
  scroll?: boolean;
  style?: ViewStyle;
  header?: ReactNode;
}

export function AppScreen({ children, scroll = false, style, header }: Props) {
  const content = <View style={[styles.content, style]}>{children}</View>;
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      {header}
      {scroll ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  scroll: { flexGrow: 1, paddingBottom: spacing.xxl },
});
