import {
  addDays, addMonths, addWeeks, addYears, differenceInCalendarDays, endOfDay, endOfMonth, endOfWeek,
  endOfYear, format, min as minDate, startOfDay, startOfMonth, startOfWeek, startOfYear, subMonths,
} from 'date-fns';

import type { WaterUnit } from '@/types/settings';
import type {
  HydrationCalendarDay, HydrationCalendarDayState, HydrationDaySummary, HydrationGoalApplyMode,
  HydrationGoalHistoryEntry, HydrationGroupBy, HydrationMilestone, HydrationOverview,
  HydrationPeriodKind, HydrationPeriodSummary, HydrationQuarterSummary, HydrationSortBy,
  HydrationYearSummary, WaterEntry,
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

export function dailyTotalsByKey(entries: WaterEntry[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) totals.set(localDayKey(entry.loggedAt), (totals.get(localDayKey(entry.loggedAt)) ?? 0) + entry.amountMl);
  return totals;
}

function eachDayInRange(start: Date, end: Date): Date[] {
  const days: Date[] = []; let cursor = startOfDay(start); const last = startOfDay(end);
  while (cursor.getTime() <= last.getTime()) { days.push(cursor); cursor = addDays(cursor, 1); }
  return days;
}

/** A goal resolver answers "what daily goal applied on this local date," constant or history-aware. */
export type GoalResolver = (dateKey: string) => number;
export function constantGoalResolver(goalMl: number): GoalResolver { return () => goalMl; }

/**
 * Resolves the goal in effect for one local date from goal-change history: the most recent entry
 * whose `effectiveFrom` is on or before the date, otherwise the current settings goal (covers both
 * "no history yet" and "date predates any recorded change").
 */
export function resolveGoalForDate(history: HydrationGoalHistoryEntry[], dateKey: string, currentGoalMl: number): number {
  let applicable: number | null = null;
  for (const entry of history) { if (entry.effectiveFrom <= dateKey) applicable = entry.goalMl; else break; }
  return applicable ?? currentGoalMl;
}
export function goalResolverFromHistory(history: HydrationGoalHistoryEntry[], currentGoalMl: number): GoalResolver {
  const sorted = [...history].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  return (dateKey) => resolveGoalForDate(sorted, dateKey, currentGoalMl);
}

/**
 * Plans the goal-history rows a goal change should write, without touching the database. On the
 * very first change (empty history), the *old* goal is backfilled at a sentinel "beginning of time"
 * date so nothing before today silently adopts the new goal. "Apply to all history" instead clears
 * history and re-seeds that sentinel with the new goal, so every past day now grades against it.
 */
export const HYDRATION_GOAL_SENTINEL_DATE = '0001-01-01';
export interface PlannedGoalChange { goalMl: number; effectiveFrom: string; clearFirst: boolean }
export function planGoalChangeEntries(
  history: HydrationGoalHistoryEntry[], currentGoalMl: number, newGoalMl: number, mode: HydrationGoalApplyMode, now: Date,
): PlannedGoalChange[] {
  if (mode === 'all') return [{ goalMl: newGoalMl, effectiveFrom: HYDRATION_GOAL_SENTINEL_DATE, clearFirst: true }];
  const plans: PlannedGoalChange[] = [];
  if (history.length === 0) plans.push({ goalMl: currentGoalMl, effectiveFrom: HYDRATION_GOAL_SENTINEL_DATE, clearFirst: false });
  const effectiveFrom = format(mode === 'tomorrow' ? addDays(now, 1) : now, 'yyyy-MM-dd');
  plans.push({ goalMl: newGoalMl, effectiveFrom, clearFirst: false });
  return plans;
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

/**
 * Generic week/month/quarter/custom-range rollup, usable for any historical window. The target is
 * the sum of each individual calendar day's applicable goal (so a goal that changed mid-period is
 * graded correctly), while the average/goal-days count only look at days that have already elapsed.
 */
export function summarizeHydrationPeriod(entries: WaterEntry[], periodStart: Date, periodEnd: Date, now: Date, resolveGoal: GoalResolver): HydrationPeriodSummary {
  const periodDayList = eachDayInRange(periodStart, periodEnd);
  const periodDays = periodDayList.length;
  const elapsedEnd = minDate([periodEnd, endOfDay(now)]);
  const elapsedDayList = periodDayList.filter((day) => day.getTime() <= elapsedEnd.getTime());
  const elapsedDays = Math.max(1, elapsedDayList.length);
  const windowEntries = entries.filter((entry) => inRange(entry, periodStart, elapsedEnd));
  const totalMl = sumMl(windowEntries);
  const targetMl = periodDayList.reduce((sum, day) => sum + resolveGoal(format(day, 'yyyy-MM-dd')), 0);
  const dailyTotals = dailyTotalsByKey(windowEntries);

  let goalDaysCount = 0; let bestDayKey: string | null = null; let bestDayMl = -1; let lowestDayKey: string | null = null; let lowestDayMl = Infinity;
  for (const day of elapsedDayList) {
    const key = format(day, 'yyyy-MM-dd'); const total = dailyTotals.get(key) ?? 0;
    if (total >= resolveGoal(key)) goalDaysCount += 1;
    if (total > bestDayMl) { bestDayMl = total; bestDayKey = key; }
    if (total < lowestDayMl) { lowestDayMl = total; lowestDayKey = key; }
  }
  if (bestDayKey === null) { bestDayMl = 0; lowestDayMl = 0; }

  return {
    totalMl, goalMl: targetMl, percent: targetMl > 0 ? Math.round((totalMl / targetMl) * 100) : 0,
    averageMl: totalMl / elapsedDays, goalDaysCount, periodDays, bestDayKey, bestDayMl, lowestDayKey, lowestDayMl,
  };
}

export function summarizeWeek(entries: WaterEntry[], now: Date, goalMl: number, weekStartsOn: 0 | 1 = 1): HydrationPeriodSummary {
  return summarizeHydrationPeriod(entries, startOfWeek(now, { weekStartsOn }), endOfWeek(now, { weekStartsOn }), now, constantGoalResolver(goalMl));
}

/** `differenceInCalendarDays` between month start/end auto-detects month length, including leap Februaries. */
export function summarizeMonth(entries: WaterEntry[], now: Date, goalMl: number): HydrationPeriodSummary {
  return summarizeHydrationPeriod(entries, startOfMonth(now), endOfMonth(now), now, constantGoalResolver(goalMl));
}

function rollingQuarterBounds(now: Date): { start: Date; end: Date } {
  return { start: startOfDay(subMonths(startOfDay(now), 3)), end: endOfDay(now) };
}

/** "Last 3 Months" is a rolling window ending today, not a fixed calendar quarter. */
export function summarizeQuarterRange(entries: WaterEntry[], periodStart: Date, periodEnd: Date, now: Date, resolveGoal: GoalResolver): HydrationQuarterSummary {
  const base = summarizeHydrationPeriod(entries, periodStart, periodEnd, now, resolveGoal);
  return {
    averageMl: base.averageMl, goalSuccessPercent: base.periodDays > 0 ? Math.round((base.goalDaysCount / base.periodDays) * 100) : 0,
    totalMl: base.totalMl, periodDays: base.periodDays, goalDaysCount: base.goalDaysCount,
    bestDayKey: base.bestDayKey, bestDayMl: base.bestDayMl, lowestDayKey: base.lowestDayKey, lowestDayMl: base.lowestDayMl,
    trendPercent: null,
  };
}

export function summarizeQuarter(entries: WaterEntry[], now: Date, goalMl: number): HydrationQuarterSummary {
  const current = rollingQuarterBounds(now);
  const summary = summarizeQuarterRange(entries, current.start, current.end, now, constantGoalResolver(goalMl));
  const previousEnd = endOfDay(addDays(current.start, -1));
  const previousStart = startOfDay(subMonths(current.start, 3));
  const previous = summarizeQuarterRange(entries, previousStart, previousEnd, previousEnd, constantGoalResolver(goalMl));
  const trendPercent = previous.averageMl > 0 ? Math.round(((summary.averageMl - previous.averageMl) / previous.averageMl) * 100) : null;
  return { ...summary, trendPercent };
}

/** A "goal day" is a local calendar day whose total meets its applicable daily goal (Phase 5 streak rule, DECISIONS.md #32). */
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

export function summarizeYearRange(entries: WaterEntry[], yearStart: Date, yearEnd: Date, now: Date, resolveGoal: GoalResolver): HydrationYearSummary {
  const elapsedEnd = minDate([yearEnd, endOfDay(now)]);
  const base = summarizeHydrationPeriod(entries, yearStart, elapsedEnd, now, resolveGoal);
  const windowEntries = entries.filter((entry) => inRange(entry, yearStart, elapsedEnd));
  const dailyTotals = dailyTotalsByKey(windowEntries);
  const goalMetKeys = Array.from(dailyTotals.entries()).filter(([key, total]) => total >= resolveGoal(key)).map(([key]) => key);
  const streaks = calculateGoalStreaks(goalMetKeys, now);

  const monthlyTotals = new Map<string, number>();
  for (const entry of windowEntries) { const key = format(new Date(entry.loggedAt), 'yyyy-MM'); monthlyTotals.set(key, (monthlyTotals.get(key) ?? 0) + entry.amountMl); }
  let bestMonthLabel: string | null = null; let bestMonthTotalMl = 0;
  for (const [key, total] of monthlyTotals) { if (total > bestMonthTotalMl) { bestMonthTotalMl = total; bestMonthLabel = format(new Date(`${key}-01T00:00:00`), 'MMMM'); } }

  return { totalMl: base.totalMl, goalMl: base.goalMl, percent: base.percent, averageMl: base.averageMl,
    longestStreakDays: streaks.longest, currentStreakDays: streaks.current, bestMonthLabel, bestMonthTotalMl };
}

export function summarizeYear(entries: WaterEntry[], now: Date, goalMl: number): HydrationYearSummary {
  return summarizeYearRange(entries, startOfYear(now), endOfYear(now), now, constantGoalResolver(goalMl));
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

/** Exact match after trimming outer whitespace only — "hydration"/"Hydration"/internal-space variants never satisfy this. */
export function isHydrationResetConfirmed(text: string): boolean { return text.trim() === 'HYDRATION'; }

export function formatWeekRangeLabel(now: Date, weekStartsOn: 0 | 1 = 1): string {
  const start = startOfWeek(now, { weekStartsOn }); const end = endOfWeek(now, { weekStartsOn });
  return start.getMonth() === end.getMonth() ? `${format(start, 'MMM d')}–${format(end, 'd')}` : `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`;
}
export function formatMonthLabel(now: Date): string { return format(now, 'MMMM yyyy'); }
export function formatQuarterRangeLabel(now: Date): string {
  const { start, end } = rollingQuarterBounds(now);
  return start.getFullYear() === end.getFullYear() ? `${format(start, 'MMM')}–${format(end, 'MMM yyyy')}` : `${format(start, 'MMM yyyy')} – ${format(end, 'MMM yyyy')}`;
}
export function formatYearLabel(now: Date): string { return format(now, 'yyyy'); }

// ---------------------------------------------------------------------------
// Historical Water-page navigation: fixed-block period bounds (distinct from the
// Home carousel's always-"ending today" rolling week/month/quarter), so Previous/Next
// step cleanly through calendar-aligned blocks of history.
// ---------------------------------------------------------------------------

export interface HydrationCustomRange { from: string; to: string }

export function periodBoundsFor(kind: HydrationPeriodKind, referenceDate: Date, weekStartsOn: 0 | 1, custom?: HydrationCustomRange): { start: Date; end: Date } {
  if (kind === 'day') return { start: startOfDay(referenceDate), end: endOfDay(referenceDate) };
  if (kind === 'week') return { start: startOfWeek(referenceDate, { weekStartsOn }), end: endOfWeek(referenceDate, { weekStartsOn }) };
  if (kind === 'month') return { start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) };
  if (kind === 'quarter') return { start: startOfMonth(subMonths(referenceDate, 2)), end: endOfMonth(referenceDate) };
  if (kind === 'year') return { start: startOfYear(referenceDate), end: endOfYear(referenceDate) };
  if (!custom) throw new Error('Custom range requires from/to.');
  const start = startOfDay(new Date(`${custom.from}T00:00:00`)); const end = endOfDay(new Date(`${custom.to}T00:00:00`));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) throw new Error('Enter a valid date range.');
  return { start, end };
}

/** Steps the reference date by one full period; custom ranges have no next/previous step. */
export function stepPeriod(kind: HydrationPeriodKind, referenceDate: Date, direction: 1 | -1): Date {
  if (kind === 'day') return addDays(referenceDate, direction);
  if (kind === 'week') return addWeeks(referenceDate, direction);
  if (kind === 'month') return addMonths(referenceDate, direction);
  if (kind === 'quarter') return addMonths(referenceDate, direction * 3);
  if (kind === 'year') return addYears(referenceDate, direction);
  return referenceDate;
}

/** "Next" is disabled once the following period would start after today — there is nothing to view there yet. */
export function canStepForward(kind: HydrationPeriodKind, referenceDate: Date, now: Date, weekStartsOn: 0 | 1): boolean {
  if (kind === 'custom') return false;
  const next = periodBoundsFor(kind, stepPeriod(kind, referenceDate, 1), weekStartsOn);
  return next.start.getTime() <= now.getTime();
}

export function isCurrentPeriod(kind: HydrationPeriodKind, referenceDate: Date, now: Date, weekStartsOn: 0 | 1): boolean {
  if (kind === 'custom') return false;
  const bounds = periodBoundsFor(kind, referenceDate, weekStartsOn);
  return now.getTime() >= bounds.start.getTime() && now.getTime() <= bounds.end.getTime();
}

export function formatPeriodLabel(kind: HydrationPeriodKind, referenceDate: Date, weekStartsOn: 0 | 1): string {
  if (kind === 'day') return format(referenceDate, 'EEEE, MMM d, yyyy');
  if (kind === 'week') return formatWeekRangeLabel(referenceDate, weekStartsOn);
  if (kind === 'month') return formatMonthLabel(referenceDate);
  if (kind === 'year') return formatYearLabel(referenceDate);
  const { start, end } = periodBoundsFor(kind, referenceDate, weekStartsOn);
  return start.getFullYear() === end.getFullYear() ? `${format(start, 'MMM')}–${format(end, 'MMM yyyy')}` : `${format(start, 'MMM yyyy')} – ${format(end, 'MMM yyyy')}`;
}

/** Generic historical summary for any period kind/reference date, goal-history aware. */
export function summarizeHistoricalPeriod(
  entries: WaterEntry[], kind: HydrationPeriodKind, referenceDate: Date, now: Date, resolveGoal: GoalResolver, weekStartsOn: 0 | 1, custom?: HydrationCustomRange,
): HydrationPeriodSummary {
  const { start, end } = periodBoundsFor(kind, referenceDate, weekStartsOn, custom);
  return summarizeHydrationPeriod(entries, start, end, now, resolveGoal);
}

export type ChartAggregation = 'daily' | 'weekly' | 'monthly';
export function determineChartAggregation(periodStart: Date, periodEnd: Date): ChartAggregation {
  const days = differenceInCalendarDays(periodEnd, periodStart) + 1;
  if (days <= 14) return 'daily';
  if (days <= 90) return 'weekly';
  return 'monthly';
}

export interface HydrationChartPoint { label: string; value: number }

/** One point per entry, for the Day view's "throughout the day" chart. */
export function buildDayEntryChartPoints(day: HydrationDaySummary): HydrationChartPoint[] {
  return day.entries.map((entry) => ({ label: format(new Date(entry.loggedAt), 'h a'), value: entry.amountMl }));
}

/** Buckets entries into daily/weekly/monthly totals across an arbitrary range, for week/month/quarter/year/custom charts. */
export function buildPeriodChartPoints(entries: WaterEntry[], periodStart: Date, periodEnd: Date, aggregation: ChartAggregation, weekStartsOn: 0 | 1 = 1): HydrationChartPoint[] {
  const windowEntries = entries.filter((entry) => inRange(entry, periodStart, periodEnd));
  const buckets = new Map<string, { start: Date; label: string; total: number }>();
  for (const entry of windowEntries) {
    const date = new Date(entry.loggedAt);
    let key: string; let start: Date; let label: string;
    if (aggregation === 'daily') { start = startOfDay(date); key = format(start, 'yyyy-MM-dd'); label = format(start, 'MMM d'); }
    else if (aggregation === 'weekly') { start = startOfWeek(date, { weekStartsOn }); key = format(start, 'yyyy-MM-dd'); label = format(start, 'MMM d'); }
    else { start = startOfMonth(date); key = format(start, 'yyyy-MM'); label = format(start, 'MMM'); }
    const existing = buckets.get(key);
    if (existing) existing.total += entry.amountMl; else buckets.set(key, { start, label, total: entry.amountMl });
  }
  return Array.from(buckets.values()).sort((a, b) => a.start.getTime() - b.start.getTime()).map((bucket) => ({ label: bucket.label, value: bucket.total }));
}

const CALENDAR_STATE_THRESHOLDS: { max: number; state: HydrationCalendarDayState }[] = [
  { max: 0, state: 'none' }, { max: 49, state: 'below-half' }, { max: 99, state: 'partial' },
];
function calendarStateForPercent(percent: number, hasData: boolean): HydrationCalendarDayState {
  if (!hasData) return 'none';
  if (percent > 100) return 'above-goal';
  if (percent >= 100) return 'goal-met';
  const match = CALENDAR_STATE_THRESHOLDS.find((entry) => percent <= entry.max);
  return match?.state ?? 'partial';
}

/** One entry per calendar day in the visible month, including days outside the current goal history. */
export function buildHydrationCalendarMonth(entries: WaterEntry[], monthReferenceDate: Date, resolveGoal: GoalResolver): HydrationCalendarDay[] {
  const start = startOfMonth(monthReferenceDate); const end = endOfMonth(monthReferenceDate);
  const totals = dailyTotalsByKey(entries.filter((entry) => inRange(entry, start, end)));
  const days: HydrationCalendarDay[] = [];
  for (let cursor = start; cursor.getTime() <= end.getTime(); cursor = addDays(cursor, 1)) {
    const dateKey = format(cursor, 'yyyy-MM-dd'); const totalMl = totals.get(dateKey) ?? 0; const goalMl = resolveGoal(dateKey);
    const percent = goalMl > 0 ? Math.round((totalMl / goalMl) * 100) : 0;
    days.push({ dateKey, totalMl, goalMl, percent, state: calendarStateForPercent(percent, totals.has(dateKey)) });
  }
  return days;
}

/** Groups raw entries for the historical entry list; 'entries' means no grouping (flat, sorted list). */
export function groupHydrationEntries(entries: WaterEntry[], groupBy: HydrationGroupBy, weekStartsOn: 0 | 1 = 1): { key: string; label: string; entries: WaterEntry[] }[] {
  if (groupBy === 'entries') return [{ key: 'all', label: '', entries }];
  const groups = new Map<string, { start: Date; label: string; entries: WaterEntry[] }>();
  for (const entry of entries) {
    const date = new Date(entry.loggedAt);
    let key: string; let start: Date; let label: string;
    if (groupBy === 'day') { start = startOfDay(date); key = format(start, 'yyyy-MM-dd'); label = format(start, 'EEEE, MMM d, yyyy'); }
    else if (groupBy === 'week') { start = startOfWeek(date, { weekStartsOn }); key = format(start, 'yyyy-MM-dd'); label = formatWeekRangeLabel(date, weekStartsOn); }
    else if (groupBy === 'month') { start = startOfMonth(date); key = format(start, 'yyyy-MM'); label = formatMonthLabel(date); }
    else if (groupBy === 'quarter') { start = startOfMonth(subMonths(date, date.getMonth() % 3)); key = format(start, 'yyyy-MM'); label = formatPeriodLabel('quarter', start, weekStartsOn); }
    else { start = startOfYear(date); key = format(start, 'yyyy'); label = formatYearLabel(date); }
    const existing = groups.get(key);
    if (existing) existing.entries.push(entry); else groups.set(key, { start, label, entries: [entry] });
  }
  return Array.from(groups.values()).sort((a, b) => b.start.getTime() - a.start.getTime()).map((group) => ({ key: format(group.start, 'yyyy-MM-dd'), label: group.label, entries: group.entries }));
}

export function sortHydrationEntries(entries: WaterEntry[], sortBy: HydrationSortBy): WaterEntry[] {
  const sorted = [...entries];
  if (sortBy === 'oldest') return sorted.sort((a, b) => a.loggedAt.localeCompare(b.loggedAt));
  if (sortBy === 'highest') return sorted.sort((a, b) => b.amountMl - a.amountMl);
  if (sortBy === 'lowest') return sorted.sort((a, b) => a.amountMl - b.amountMl);
  return sorted.sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
}

/** "Best/lowest goal completion" sorts day-groups (not raw entries) by their percent of goal met. */
export function sortHydrationDayGroupsByCompletion(dayTotals: { dateKey: string; totalMl: number; goalMl: number }[], direction: 'best' | 'lowest'): { dateKey: string; totalMl: number; goalMl: number; percent: number }[] {
  const withPercent = dayTotals.map((day) => ({ ...day, percent: day.goalMl > 0 ? (day.totalMl / day.goalMl) * 100 : 0 }));
  return withPercent.sort((a, b) => direction === 'best' ? b.percent - a.percent : a.percent - b.percent);
}
