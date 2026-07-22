import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  FlatList, StyleSheet, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';

import { HydrationCarouselPage } from '@/components/HydrationCarouselPage';
import { HydrationPaginationDots } from '@/components/HydrationPaginationDots';
import { spacing } from '@/constants/spacing';

export interface HydrationCarouselPageData { label: string; content: ReactNode; }

interface Props { page: number; onPageChange: (page: number) => void; pages: HydrationCarouselPageData[]; }

/** One-tap-to-open horizontal carousel replacing the old repeated-arrow-tap expansion (see DECISIONS.md). */
export function HydrationStatsCarousel({ page, onPageChange, pages }: Props) {
  const [width, setWidth] = useState(0);
  const listRef = useRef<FlatList<HydrationCarouselPageData>>(null);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  useEffect(() => {
    if (width > 0) listRef.current?.scrollToOffset({ offset: page * width, animated: false });
  }, [width]); // eslint-disable-line react-hooks/exhaustive-deps -- only re-sync on first measured layout, not every external page change

  const onMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width <= 0) return;
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    if (index !== page) onPageChange(index);
  }, [width, page, onPageChange]);

  const jumpToPage = (index: number) => { onPageChange(index); listRef.current?.scrollToOffset({ offset: index * width, animated: true }); };

  return (
    <View onLayout={onLayout} style={styles.container}>
      {width > 0 && (
        <FlatList ref={listRef} data={pages} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.label} initialScrollIndex={page}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={onMomentumScrollEnd}
          renderItem={({ item }) => <HydrationCarouselPage width={width}>{item.content}</HydrationCarouselPage>}
          accessibilityLabel={`${pages[page]?.label}. Swipe left or right to see other periods.`} />
      )}
      <HydrationPaginationDots count={pages.length} activeIndex={page} labels={pages.map((item) => item.label)} onSelect={jumpToPage} />
    </View>
  );
}

const styles = StyleSheet.create({ container: { gap: spacing.xs } });
