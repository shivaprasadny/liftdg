import { describe, expect, it } from 'vitest';

import {
  buildHydrationCalendarMonth, buildPeriodChartPoints, calculateGlassCount, canStepForward,
  determineChartAggregation, displayUnitToMilliliters, formatServingAmount, formatWaterVolume,
  getMilestoneMessage, getRemainingText, goalResolverFromHistory, groupHydrationEntries,
  isCurrentPeriod, isHydrationResetConfirmed, millilitersToDisplayUnit, periodBoundsFor,
  pickEncouragingMessage, planGoalChangeEntries, resolveGoalForDate, sortHydrationDayGroupsByCompletion,
  sortHydrationEntries, stepPeriod, summarizeDay, summarizeMonth, summarizeQuarter, summarizeWeek, summarizeYear,
} from './hydrationService';
import type { HydrationGoalHistoryEntry, WaterEntry } from '@/types/hydration';

/** Builds a local-time ISO timestamp from calendar parts, avoiding UTC-string timezone drift in fixtures. */
function localIso(year: number, month: number, day: number, hour = 12): string {
  return new Date(year, month - 1, day, hour).toISOString();
}

let nextId = 0;
function entry(amountMl: number, loggedAt: string): WaterEntry {
  nextId += 1;
  return { id: `entry-${nextId}`, amountMl, loggedAt, source: 'quick_add', notes: null, createdAt: loggedAt, updatedAt: loggedAt };
}

describe('unit conversion', () => {
  it('converts milliliters to liters for metric display', () => expect(millilitersToDisplayUnit(1800, 'metric')).toBeCloseTo(1.8));
  it('converts milliliters to US fluid ounces', () => expect(millilitersToDisplayUnit(1000, 'us')).toBeCloseTo(33.814, 2));
  it('round-trips display units back to milliliters', () => {
    expect(displayUnitToMilliliters(1.8, 'metric')).toBeCloseTo(1800);
    expect(displayUnitToMilliliters(33.814, 'us')).toBeCloseTo(1000, 0);
  });
  it('formats a metric total in liters', () => expect(formatWaterVolume(1800, 'metric')).toBe('1.8 L'));
  it('formats a US total in fluid ounces', () => expect(formatWaterVolume(1000, 'us')).toBe('34 fl oz'));
  it('formats small metric servings in milliliters, not liters', () => expect(formatServingAmount(300, 'metric')).toBe('300 ml'));
  it('formats large metric servings in liters', () => expect(formatServingAmount(1000, 'metric')).toBe('1 L'));
});

describe('calculateGlassCount', () => {
  it('rounds total volume divided by serving size', () => expect(calculateGlassCount(1800, 300)).toBe(6));
  it('is zero for a zero serving size', () => expect(calculateGlassCount(1800, 0)).toBe(0));
});

describe('summarizeDay', () => {
  const now = new Date(2026, 6, 20, 18);
  it('sums only today\'s entries and computes percent/remaining', () => {
    const entries = [entry(300, localIso(2026, 7, 20, 8)), entry(300, localIso(2026, 7, 20, 12)), entry(500, localIso(2026, 7, 19, 20))];
    const day = summarizeDay(entries, now, 3000, 300);
    expect(day.totalMl).toBe(600);
    expect(day.percent).toBe(20);
    expect(day.remainingMl).toBe(2400);
    expect(day.overGoalMl).toBe(0);
    expect(day.glassCount).toBe(2);
    expect(day.entries).toHaveLength(2);
  });
  it('reports overGoalMl once the daily goal is exceeded', () => {
    const entries = [entry(3200, localIso(2026, 7, 20, 8))];
    const day = summarizeDay(entries, now, 3000, 300);
    expect(day.overGoalMl).toBe(200);
    expect(day.remainingMl).toBe(0);
    expect(day.percent).toBe(107);
  });
});

describe('summarizeWeek / summarizeMonth', () => {
  it('targets daily goal × 7 for a week and counts goal-met days', () => {
    const now = new Date(2026, 6, 22); // Wednesday
    const entries = [
      entry(3000, localIso(2026, 7, 20)), entry(3000, localIso(2026, 7, 21)), entry(1000, localIso(2026, 7, 22)),
    ];
    const week = summarizeWeek(entries, now, 3000, 1);
    expect(week.periodDays).toBe(7);
    expect(week.goalMl).toBe(21000);
    expect(week.goalDaysCount).toBe(2);
  });

  it('auto-detects a 31-day month length', () => {
    const now = new Date(2026, 6, 15);
    const month = summarizeMonth([], now, 3000);
    expect(month.periodDays).toBe(31);
    expect(month.goalMl).toBe(93000);
  });

  it('auto-detects a leap-year February (29 days)', () => {
    const now = new Date(2028, 1, 10); // 2028 is a leap year
    const month = summarizeMonth([], now, 3000);
    expect(month.periodDays).toBe(29);
  });

  it('detects a non-leap-year February (28 days)', () => {
    const now = new Date(2026, 1, 10);
    const month = summarizeMonth([], now, 3000);
    expect(month.periodDays).toBe(28);
  });
});

describe('summarizeQuarter', () => {
  it('uses a rolling 3-month window ending today, not a fixed calendar quarter', () => {
    const now = new Date(2026, 6, 20);
    const entries = [entry(3000, localIso(2026, 4, 25)), entry(3000, localIso(2026, 1, 1))];
    const quarter = summarizeQuarter(entries, now, 3000);
    expect(quarter.totalMl).toBe(3000);
    expect(quarter.periodDays).toBeGreaterThan(85);
    expect(quarter.periodDays).toBeLessThan(95);
  });
});

describe('summarizeYear', () => {
  it('computes a current streak ending today and preserves the longest streak', () => {
    const now = new Date(2026, 6, 20);
    const entries = [
      entry(3000, localIso(2026, 7, 18)), entry(3000, localIso(2026, 7, 19)), entry(3000, localIso(2026, 7, 20)),
      entry(3000, localIso(2026, 3, 1)), entry(3000, localIso(2026, 3, 2)), entry(3000, localIso(2026, 3, 3)), entry(3000, localIso(2026, 3, 4)),
    ];
    const year = summarizeYear(entries, now, 3000);
    expect(year.currentStreakDays).toBe(3);
    expect(year.longestStreakDays).toBe(4);
  });

  it('identifies the highest-volume month as the best month', () => {
    const now = new Date(2026, 6, 20);
    const entries = [entry(3000, localIso(2026, 1, 5)), entry(3000, localIso(2026, 3, 5)), entry(3000, localIso(2026, 3, 6)), entry(3000, localIso(2026, 3, 7))];
    const year = summarizeYear(entries, now, 3000);
    expect(year.bestMonthLabel).toBe('March');
    expect(year.bestMonthTotalMl).toBe(9000);
  });

  it('has no streak or best month with no history', () => {
    const year = summarizeYear([], new Date(2026, 6, 20), 3000);
    expect(year.currentStreakDays).toBe(0);
    expect(year.longestStreakDays).toBe(0);
    expect(year.bestMonthLabel).toBeNull();
  });
});

describe('getMilestoneMessage', () => {
  it('returns the start message at 0%', () => expect(getMilestoneMessage(0).key).toBe('start'));
  it('returns the quarter message from 25%', () => expect(getMilestoneMessage(30).key).toBe('quarter'));
  it('returns the half message from 50%', () => expect(getMilestoneMessage(60).key).toBe('half'));
  it('returns the three-quarter message from 75%', () => expect(getMilestoneMessage(80).key).toBe('threeQuarter'));
  it('returns the almost message from 90%', () => expect(getMilestoneMessage(95).key).toBe('almost'));
  it('returns the complete message at exactly 100%', () => expect(getMilestoneMessage(100).key).toBe('complete'));
  it('returns the over-goal message above 100%', () => expect(getMilestoneMessage(113).key).toBe('overGoal'));
});

describe('getRemainingText', () => {
  const base = { dateKey: '2026-07-20', goalMl: 3000, glassCount: 0, entries: [] };
  it('shows remaining volume before the goal', () => expect(getRemainingText({ ...base, totalMl: 1800, remainingMl: 1200, overGoalMl: 0, percent: 60 }, 'metric')).toBe('1.2 L remaining'));
  it('shows the exact completion message at the goal', () => expect(getRemainingText({ ...base, totalMl: 3000, remainingMl: 0, overGoalMl: 0, percent: 100 }, 'metric')).toBe('Daily Goal Completed'));
  it('shows the overage above the goal', () => expect(getRemainingText({ ...base, totalMl: 3300, remainingMl: 0, overGoalMl: 300, percent: 110 }, 'metric')).toBe("0.3 L above today's goal"));
});

describe('pickEncouragingMessage', () => {
  it('never immediately repeats the previous message', () => {
    let previous: string | undefined;
    for (let i = 0; i < 20; i += 1) {
      const next = pickEncouragingMessage(previous, () => 0.5);
      expect(next).not.toBe(previous);
      previous = next;
    }
  });
});

describe('isHydrationResetConfirmed', () => {
  it('accepts the exact word, trimmed of outer whitespace', () => {
    expect(isHydrationResetConfirmed('HYDRATION')).toBe(true);
    expect(isHydrationResetConfirmed('  HYDRATION  ')).toBe(true);
  });
  it('rejects wrong casing', () => { expect(isHydrationResetConfirmed('hydration')).toBe(false); expect(isHydrationResetConfirmed('Hydration')).toBe(false); });
  it('rejects internal extra spaces', () => expect(isHydrationResetConfirmed('HYDRA TION')).toBe(false));
  it('rejects an empty or partial value', () => { expect(isHydrationResetConfirmed('')).toBe(false); expect(isHydrationResetConfirmed('HYDRATIO')).toBe(false); });
});

function goalEntry(goalMl: number, effectiveFrom: string): HydrationGoalHistoryEntry {
  return { id: effectiveFrom, goalMl, effectiveFrom, createdAt: effectiveFrom, updatedAt: effectiveFrom };
}

describe('goal history resolution', () => {
  it('falls back to the current goal with no history at all', () => {
    expect(resolveGoalForDate([], '2026-01-01', 3000)).toBe(3000);
  });
  it('resolves the goal effective on or before the requested date', () => {
    const history = [goalEntry(2000, '2026-01-01'), goalEntry(3000, '2026-06-01')];
    expect(resolveGoalForDate(history, '2026-03-15', 3000)).toBe(2000);
    expect(resolveGoalForDate(history, '2026-06-01', 3000)).toBe(3000);
    expect(resolveGoalForDate(history, '2026-12-31', 3000)).toBe(3000);
  });
  it('falls back to the current goal for a date before the earliest recorded change', () => {
    const history = [goalEntry(2000, '2026-06-01')];
    expect(resolveGoalForDate(history, '2026-01-01', 3500)).toBe(3500);
  });
  it('goalResolverFromHistory produces the same resolution as a direct lookup regardless of input order', () => {
    const history = [goalEntry(3000, '2026-06-01'), goalEntry(2000, '2026-01-01')];
    const resolver = goalResolverFromHistory(history, 3000);
    expect(resolver('2026-03-01')).toBe(2000);
  });
});

describe('planGoalChangeEntries', () => {
  const now = new Date(2026, 6, 20);
  it('backfills the old goal at the sentinel date on the very first change', () => {
    const plans = planGoalChangeEntries([], 3000, 3500, 'today', now);
    expect(plans).toHaveLength(2);
    expect(plans[0]).toMatchObject({ goalMl: 3000, effectiveFrom: '0001-01-01' });
    expect(plans[1]).toMatchObject({ goalMl: 3500, effectiveFrom: '2026-07-20' });
  });
  it('does not re-backfill once history already exists', () => {
    const existing = [goalEntry(3000, '0001-01-01')];
    const plans = planGoalChangeEntries(existing, 3000, 3500, 'today', now);
    expect(plans).toHaveLength(1);
  });
  it('"tomorrow" takes effect the next calendar day', () => {
    const plans = planGoalChangeEntries([goalEntry(3000, '0001-01-01')], 3000, 3500, 'tomorrow', now);
    expect(plans[0].effectiveFrom).toBe('2026-07-21');
  });
  it('"all" clears history and applies the new goal from the sentinel date', () => {
    const plans = planGoalChangeEntries([goalEntry(3000, '0001-01-01'), goalEntry(2500, '2026-01-01')], 3000, 4000, 'all', now);
    expect(plans).toEqual([{ goalMl: 4000, effectiveFrom: '0001-01-01', clearFirst: true }]);
  });
});

describe('period bounds and navigation', () => {
  const now = new Date(2026, 6, 20, 12); // Monday, July 20 2026

  it('computes day/week/month/quarter/year bounds', () => {
    expect(periodBoundsFor('day', now, 1).start.getDate()).toBe(20);
    const week = periodBoundsFor('week', now, 1); expect(week.start.getDay()).toBe(1);
    const month = periodBoundsFor('month', now, 1); expect(month.start.getDate()).toBe(1); expect(month.end.getMonth()).toBe(6);
    const quarter = periodBoundsFor('quarter', now, 1); expect(quarter.start.getMonth()).toBe(4); expect(quarter.end.getMonth()).toBe(6);
    const year = periodBoundsFor('year', now, 1); expect(year.start.getMonth()).toBe(0); expect(year.end.getMonth()).toBe(11);
  });

  it('rejects an inverted or invalid custom range', () => {
    expect(() => periodBoundsFor('custom', now, 1, { from: '2026-07-20', to: '2026-01-01' })).toThrow();
  });

  it('steps week/month/year forward and backward by one period', () => {
    expect(stepPeriod('week', now, 1).getDate()).toBe(27);
    expect(stepPeriod('week', now, -1).getDate()).toBe(13);
    expect(stepPeriod('month', now, 1).getMonth()).toBe(7);
    expect(stepPeriod('year', now, -1).getFullYear()).toBe(2025);
  });

  it('disallows stepping forward once the next period would start after today', () => {
    expect(canStepForward('month', now, now, 1)).toBe(false);
    expect(canStepForward('month', new Date(2026, 5, 20), now, 1)).toBe(true);
  });

  it('custom ranges never allow forward/backward stepping', () => {
    expect(canStepForward('custom', now, now, 1)).toBe(false);
  });

  it('identifies whether the viewed period contains today', () => {
    expect(isCurrentPeriod('month', now, now, 1)).toBe(true);
    expect(isCurrentPeriod('month', new Date(2026, 5, 20), now, 1)).toBe(false);
  });
});

describe('determineChartAggregation', () => {
  it('is daily for up to 14 days', () => expect(determineChartAggregation(new Date(2026, 0, 1), new Date(2026, 0, 14))).toBe('daily'));
  it('is weekly between 15 and 90 days', () => expect(determineChartAggregation(new Date(2026, 0, 1), new Date(2026, 0, 15))).toBe('weekly'));
  it('is monthly beyond 90 days', () => expect(determineChartAggregation(new Date(2026, 0, 1), new Date(2026, 3, 15))).toBe('monthly'));
});

describe('buildPeriodChartPoints', () => {
  it('buckets entries into one point per day, oldest first', () => {
    const entries = [entry(300, localIso(2026, 7, 2)), entry(500, localIso(2026, 7, 1)), entry(200, localIso(2026, 7, 1))];
    const points = buildPeriodChartPoints(entries, new Date(2026, 6, 1), new Date(2026, 6, 2, 23, 59, 59), 'daily');
    expect(points).toHaveLength(2);
    expect(points[0].value).toBe(700);
    expect(points[1].value).toBe(300);
  });
});

describe('buildHydrationCalendarMonth', () => {
  it('classifies each day by percent of its own goal, never relying on a single fixed threshold', () => {
    const resolve = () => 3000;
    const entries = [
      entry(3000, localIso(2026, 7, 1)), entry(1000, localIso(2026, 7, 2)),
      entry(3500, localIso(2026, 7, 3)),
    ];
    const days = buildHydrationCalendarMonth(entries, new Date(2026, 6, 15), resolve);
    const byKey = new Map(days.map((day) => [day.dateKey, day]));
    expect(byKey.get('2026-07-01')?.state).toBe('goal-met');
    expect(byKey.get('2026-07-02')?.state).toBe('below-half');
    expect(byKey.get('2026-07-03')?.state).toBe('above-goal');
    expect(byKey.get('2026-07-04')?.state).toBe('none');
  });
});

describe('groupHydrationEntries / sortHydrationEntries', () => {
  const entries = [entry(300, localIso(2026, 7, 1)), entry(500, localIso(2026, 7, 2)), entry(200, localIso(2026, 7, 1, 8))];

  it('groups by day and orders groups newest first', () => {
    const groups = groupHydrationEntries(entries, 'day', 1);
    expect(groups).toHaveLength(2);
    expect(groups[0].key).toBe('2026-07-02');
  });
  it('leaves entries flat and ungrouped for "entries"', () => {
    expect(groupHydrationEntries(entries, 'entries', 1)).toEqual([{ key: 'all', label: '', entries }]);
  });
  it('sorts by newest, oldest, highest, and lowest intake', () => {
    expect(sortHydrationEntries(entries, 'newest')[0].amountMl).toBe(500);
    expect(sortHydrationEntries(entries, 'oldest')[0].amountMl).toBe(200);
    expect(sortHydrationEntries(entries, 'highest')[0].amountMl).toBe(500);
    expect(sortHydrationEntries(entries, 'lowest')[0].amountMl).toBe(200);
  });
});

describe('sortHydrationDayGroupsByCompletion', () => {
  it('ranks days by percent of goal, best or lowest first', () => {
    const days = [{ dateKey: 'a', totalMl: 1000, goalMl: 2000 }, { dateKey: 'b', totalMl: 3000, goalMl: 2000 }, { dateKey: 'c', totalMl: 500, goalMl: 2000 }];
    expect(sortHydrationDayGroupsByCompletion(days, 'best').map((d) => d.dateKey)).toEqual(['b', 'a', 'c']);
    expect(sortHydrationDayGroupsByCompletion(days, 'lowest').map((d) => d.dateKey)).toEqual(['c', 'a', 'b']);
  });
});
