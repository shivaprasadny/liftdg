import {
  differenceInCalendarDays, endOfDay, endOfMonth, endOfWeek, endOfYear, format,
  min as minDate, startOfDay, startOfMonth, startOfWeek, startOfYear, subMonths,
} from 'date-fns';

import type { WaterUnit } from '@/types/settings';
import type {
  HydrationDaySummary, HydrationMilestone, HydrationOverview, HydrationPeriodSummary,
  HydrationQuarterSummary, HydrationYearSummary, WaterEntry,
} from '@/types/hydration';

const ML_PER_US_FL_OZ = 29.5735295625;

export function millilitersToDisplayUnit(ml: number, unit: WaterUnit): number {
  return unit === 'us' ? ml / ML_PER_US_FL_OZ : ml / 1000;
}
export function displayUnitToMilliliters(value: number, unit: WaterUnit): number {
  return unit === 'us' ? value * ML_PER_US_FL_OZ : value * 1000;
}
export function formatWaterVolume(ml: number, unit: WaterUnit): string {
  return unit === 'us' ? `${millilitersToDisplayUnit(ml, unit).toFixed(0)} fl oz` : `${millilitersToDisplayUnit(ml, unit).toFixed(1)} L`;
}
/** Serving-sized amounts read better as "300 ml" than "0.3 L"; larger metric totals still use liters. */
export function formatServingAmount(ml: number, unit: WaterUnit): string {
  if (unit === 'us') return `${(ml / ML_PER_US_FL_OZ).toFixed(0)} fl oz`;
  return ml < 1000 ? `${Math.round(ml)} ml` : `${parseFloat((ml / 1000).toFixed(2))} L`;
}

export function calculateGlassCount(totalMl: number, servingSizeMl: number): number {
  return servingSizeMl > 0 ? Math.round(totalMl / servingSizeMl) : 0;
}

/** Device-local calendar day of a logged timestamp; never derived from raw UTC string slicing. */
export function localDayKey(iso: string): string { return format(new Date(iso), 'yyyy-MM-dd'); }

function sumMl(entries: WaterEntry[]): number { return entries.reduce((total, entry) => total + entry.amountMl, 0); }
function inRange(entry: WaterEntry, from: Date, to: Date): boolean { const time = new Date(entry.loggedAt).getTime(); return time >= from.getTime() && time <= to.getTime(); }

function dailyTotalsByKey(entries: WaterEntry[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) totals.set(localDayKey(entry.loggedAt), (totals.get(localDayKey(entry.loggedAt)) ?? 0) + entry.amountMl);
  return totals;
}

export function summarizeDay(entries: WaterEntry[], now: Date, goalMl: number, servingSizeMl: number): HydrationDaySummary {
  const from = startOfDay(now); const to = endOfDay(now);
  const dayEntries = entries.filter((entry) => inRange(entry, from, to)).sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  const totalMl = sumMl(dayEntries);
  return {
    dateKey: format(now, 'yyyy-MM-dd'), totalMl, goalMl, percent: goalMl > 0 ? Math.round((totalMl / goalMl) * 100) : 0,
    remainingMl: Math.max(0, goalMl - totalMl), overGoalMl: Math.max(0, totalMl - goalMl),
    glassCount: calculateGlassCount(totalMl, servingSizeMl), entries: dayEntries,
  };
}

/** Shared week/month rollup: a fixed calendar-length target with an elapsed-day average and goal-day count. */
function summarizePeriod(entries: WaterEntry[], periodStart: Date, periodEnd: Date, now: Date, goalMl: number): HydrationPeriodSummary {
  const periodDays = differenceInCalendarDays(periodEnd, periodStart) + 1;
  const elapsedEnd = minDate([periodEnd, endOfDay(now)]);
  const elapsedDays = Math.max(1, differenceInCalendarDays(elapsedEnd, periodStart) + 1);
  const windowEntries = entries.filter((entry) => inRange(entry, periodStart, elapsedEnd));
  const totalMl = sumMl(windowEntries);
  const targetMl = goalMl * periodDays;
  const dailyTotals = dailyTotalsByKey(windowEntries);
  const goalDaysCount = Array.from(dailyTotals.values()).filter((total) => total >= goalMl).length;
  return { totalMl, goalMl: targetMl, percent: targetMl > 0 ? Math.round((totalMl / targetMl) * 100) : 0, averageMl: totalMl / elapsedDays, goalDaysCount, periodDays };
}

export function summarizeWeek(entries: WaterEntry[], now: Date, goalMl: number, weekStartsOn: 0 | 1 = 1): HydrationPeriodSummary {
  return summarizePeriod(entries, startOfWeek(now, { weekStartsOn }), endOfWeek(now, { weekStartsOn }), now, goalMl);
}

/** `differenceInCalendarDays` between month start/end auto-detects month length, including leap Februaries. */
export function summarizeMonth(entries: WaterEntry[], now: Date, goalMl: number): HydrationPeriodSummary {
  return summarizePeriod(entries, startOfMonth(now), endOfMonth(now), now, goalMl);
}

/** "Last 3 Months" is a rolling window ending today, not a fixed calendar quarter. */
export function summarizeQuarter(entries: WaterEntry[], now: Date, goalMl: number): HydrationQuarterSummary {
  const periodStart = startOfDay(subMonths(startOfDay(now), 3)); const periodEnd = endOfDay(now);
  const periodDays = differenceInCalendarDays(periodEnd, periodStart) + 1;
  const windowEntries = entries.filter((entry) => inRange(entry, periodStart, periodEnd));
  const totalMl = sumMl(windowEntries);
  const dailyTotals = dailyTotalsByKey(windowEntries);
  const goalDaysCount = Array.from(dailyTotals.values()).filter((total) => total >= goalMl).length;
  return { averageMl: totalMl / periodDays, goalSuccessPercent: Math.round((goalDaysCount / periodDays) * 100), totalMl, periodDays };
}

/** A "goal day" is a local calendar day whose total meets the daily goal; mirrors the Phase 5 streak rule. */
function calculateGoalStreaks(goalMetDayKeys: string[], now: Date): { longest: number; current: number } {
  if (goalMetDayKeys.length === 0) return { longest: 0, current: 0 };
  const sortedKeys = Array.from(new Set(goalMetDayKeys)).sort();
  const days = sortedKeys.map((key) => startOfDay(new Date(`${key}T00:00:00`)));
  let longest = 1; let run = 1;
  for (let i = 1; i < days.length; i += 1) { run = differenceInCalendarDays(days[i], days[i - 1]) === 1 ? run + 1 : 1; longest = Math.max(longest, run); }
  const gapFromToday = differenceInCalendarDays(startOfDay(now), days[days.length - 1]);
  let current = 0;
  if (gapFromToday <= 1) {
    current = 1;
    for (let i = days.length - 1; i > 0; i -= 1) { if (differenceInCalendarDays(days[i], days[i - 1]) === 1) current += 1; else break; }
  }
  return { longest, current };
}

export function summarizeYear(entries: WaterEntry[], now: Date, goalMl: number): HydrationYearSummary {
  const periodStart = startOfYear(now); const periodEnd = endOfYear(now);
  const base = summarizePeriod(entries, periodStart, minDate([periodEnd, endOfDay(now)]), now, goalMl);
  const elapsedEnd = minDate([periodEnd, endOfDay(now)]);
  const windowEntries = entries.filter((entry) => inRange(entry, periodStart, elapsedEnd));
  const dailyTotals = dailyTotalsByKey(windowEntries);
  const streaks = calculateGoalStreaks(Array.from(dailyTotals.entries()).filter(([, total]) => total >= goalMl).map(([key]) => key), now);

  const monthlyTotals = new Map<string, number>();
  for (const entry of windowEntries) { const key = format(new Date(entry.loggedAt), 'yyyy-MM'); monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + entry.amountMl); }
  let bestMonthLabel: string | null = null; let bestMonthTotalMl = 0;
  for (const [key, total] of monthlyTotals) { if (total > bestMonthTotalMl) { bestMonthTotalMl = total; bestMonthLabel = format(new Date(`${key}-01T00:00:00`), 'MMMM'); } }

  return { totalMl: base.totalMl, goalMl: base.goalMl, percent: base.percent, averageMl: base.averageMl,
    longestStreakDays: streaks.longest, currentStreakDays: streaks.current, bestMonthLabel, bestMonthTotalMl };
}

export function buildHydrationOverview(
  entries: WaterEntry[], now: Date, goalMl: number, servingSizeMl: number, weekStartsOn: 0 | 1 = 1,
): HydrationOverview {
  return {
    today: summarizeDay(entries, now, goalMl, servingSizeMl),
    week: summarizeWeek(entries, now, goalMl, weekStartsOn),
    month: summarizeMonth(entries, now, goalMl),
    quarter: summarizeQuarter(entries, now, goalMl),
    year: summarizeYear(entries, now, goalMl),
  };
}

/** Earliest timestamp any displayed rollup can need: the wider of year-to-date or the rolling 3-month window. */
export function getHydrationOverviewRangeStart(now: Date): Date {
  return minDate([startOfYear(now), startOfDay(subMonths(startOfDay(now), 3))]);
}

const milestoneMessages: Record<HydrationMilestone['key'], string> = {
  start: 'Start with your first glass.', quarter: 'Good start—keep going!', half: 'Halfway there!',
  threeQuarter: "You're doing great!", almost: 'Only one more glass!',
  complete: "🎉 Great job! You reached today's hydration goal.", overGoal: 'Excellent consistency!',
};

export function getMilestoneMessage(percent: number): HydrationMilestone {
  const key = percent > 100 ? 'overGoal' : percent >= 100 ? 'complete' : percent >= 90 ? 'almost'
    : percent >= 75 ? 'threeQuarter' : percent >= 50 ? 'half' : percent >= 25 ? 'quarter' : 'start';
  return { key, message: milestoneMessages[key] };
}

export function getRemainingText(day: HydrationDaySummary, unit: WaterUnit): string {
  if (day.totalMl < day.goalMl) return `${formatWaterVolume(day.remainingMl, unit)} remaining`;
  if (day.totalMl === day.goalMl) return 'Daily Goal Completed';
  return `${formatWaterVolume(day.overGoalMl, unit)} above today's goal`;
}

const encouragingMessages = [
  'Stay hydrated!', 'Nice work!', 'Keep it going!', 'One more glass!',
  "You're almost there!", 'Excellent consistency!', 'Hydration matters!', 'Looking good today!',
];

/** Randomizes from the pool but never repeats the immediately previous message. */
export function pickEncouragingMessage(previous?: string, randomFn: () => number = Math.random): string {
  const message = encouragingMessages[Math.floor(randomFn() * encouragingMessages.length)];
  if (message !== previous) return message;
  return encouragingMessages[(encouragingMessages.indexOf(message) + 1) % encouragingMessages.length];
}
