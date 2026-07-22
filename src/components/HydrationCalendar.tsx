import { Ionicons } from '@expo/vector-icons';
import { getDay } from 'date-fns';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAppColors } from '@/hooks/useAppColors';
import type { HydrationCalendarDay, HydrationCalendarDayState } from '@/types/hydration';

const stateIcon: Record<HydrationCalendarDayState, keyof typeof Ionicons.glyphMap | null> = {
  none: null, 'below-half': 'water-outline', partial: 'water-outline', 'goal-met': 'checkmark-circle', 'above-goal': 'star',
};
const stateDescription: Record<HydrationCalendarDayState, string> = {
  none: 'no data', 'below-half': 'below half of goal', partial: 'goal in progress', 'goal-met': 'goal reached', 'above-goal': 'above goal',
};

/** Each day shows an icon and percentage, never color alone, per accessibility requirements. */
export function HydrationCalendar({ monthReferenceDate, days, onSelectDay }: { monthReferenceDate: Date; days: HydrationCalendarDay[]; onSelectDay: (dateKey: string) => void }) {
  const colors = useAppColors();
  const leadingBlanks = getDay(new Date(monthReferenceDate.getFullYear(), monthReferenceDate.getMonth(), 1));
  const stateColor = (state: HydrationCalendarDayState) => (
    state === 'goal-met' ? colors.success : state === 'above-goal' ? colors.accent : state === 'partial' ? colors.warning : colors.textMuted
  );

  return (
    <View>
      <View style={styles.weekHeader}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => <Text key={index} style={[styles.weekHeaderText, { color: colors.textMuted }]}>{label}</Text>)}
      </View>
      <View style={styles.grid}>
        {Array.from({ length: leadingBlanks }, (_, index) => <View key={`blank-${index}`} style={styles.cell} />)}
        {days.map((day) => {
          const icon = stateIcon[day.state];
          return (
            <Pressable key={day.dateKey} accessibilityRole="button"
              accessibilityLabel={`${day.dateKey}: ${stateDescription[day.state]}, ${day.percent}% of goal`}
              onPress={() => onSelectDay(day.dateKey)} style={[styles.cell, styles.dayCell, { borderColor: colors.border }]}>
              <Text style={[styles.dayNumber, { color: colors.text }]}>{Number(day.dateKey.slice(-2))}</Text>
              {icon && <Ionicons name={icon} size={14} color={stateColor(day.state)} />}
              {day.state !== 'none' && <Text style={[styles.dayPercent, { color: stateColor(day.state) }]}>{day.percent}%</Text>}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekHeader: { flexDirection: 'row' },
  weekHeaderText: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  dayCell: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.sm, gap: 1 },
  dayNumber: { ...typography.caption, fontWeight: '700' },
  dayPercent: { fontSize: 9 },
});
