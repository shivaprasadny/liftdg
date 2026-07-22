import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

/** Sizes one carousel page to exactly the container's width so FlatList paging snaps cleanly. */
export function HydrationCarouselPage({ width, children }: { width: number; children: ReactNode }) {
  return <View style={[styles.page, { width }]}>{children}</View>;
}

const styles = StyleSheet.create({ page: { justifyContent: 'center' } });
