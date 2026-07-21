import { describe, expect, it } from 'vitest';

import {
  calculateGlassCount, displayUnitToMilliliters, formatServingAmount, formatWaterVolume,
  getMilestoneMessage, getRemainingText, millilitersToDisplayUnit, pickEncouragingMessage,
  summarizeDay, summarizeMonth, summarizeQuarter, summarizeWeek, summarizeYear,
} from './hydrationService';
import type { WaterEntry } from '@/types/hydration';

/** Builds a local-time ISO timestamp from calendar parts, avoiding UTC-string timezone drift in fixtures. */
function localIso(year: number, month: number, day: number, hour = 12): string {
  return new Date(year, month - 1, day, hour).toISOString();
}

let nextId = 0;
function entry(amountMl: number, loggedAt: string): WaterEntry {
  nextId += 1;
  return { id: `entry-${nextId}`, amountMl, loggedAt, createdAt: loggedAt, updatedAt: loggedAt };
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
