export const waterEntrySources = ['quick_add', 'custom_add', 'edited', 'imported'] as const;
export type WaterEntrySource = (typeof waterEntrySources)[number];

export interface WaterEntry {
  id: string;
  amountMl: number;
  loggedAt: string;
  source: WaterEntrySource;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Which of the four carousel pages is showing on the Home card. */
export type HydrationCarouselPageIndex = 0 | 1 | 2 | 3;

export type HydrationMilestoneKey = 'start' | 'quarter' | 'half' | 'threeQuarter' | 'almost' | 'complete' | 'overGoal';
export interface HydrationMilestone { key: HydrationMilestoneKey; message: string; }

/** Today's totals; `entries` is chronological (oldest first) for the "today's entries" delete list. */
export interface HydrationDaySummary {
  dateKey: string;
  totalMl: number;
  goalMl: number;
  percent: number;
  remainingMl: number;
  overGoalMl: number;
  glassCount: number;
  entries: WaterEntry[];
}

/** Shared shape for week/month/custom period rollups: a fixed calendar-length target, elapsed-day average, and best/lowest day. */
export interface HydrationPeriodSummary {
  totalMl: number;
  goalMl: number;
  percent: number;
  averageMl: number;
  goalDaysCount: number;
  periodDays: number;
  bestDayKey: string | null;
  bestDayMl: number;
  lowestDayKey: string | null;
  lowestDayMl: number;
}

export interface HydrationQuarterSummary {
  averageMl: number;
  goalSuccessPercent: number;
  totalMl: number;
  periodDays: number;
  goalDaysCount: number;
  bestDayKey: string | null;
  bestDayMl: number;
  lowestDayKey: string | null;
  lowestDayMl: number;
  /** Percent change in daily average vs. the immediately preceding 3-month window; null without enough history. */
  trendPercent: number | null;
}

export interface HydrationYearSummary {
  totalMl: number;
  goalMl: number;
  percent: number;
  averageMl: number;
  longestStreakDays: number;
  currentStreakDays: number;
  bestMonthLabel: string | null;
  bestMonthTotalMl: number;
}

export interface HydrationOverview {
  today: HydrationDaySummary;
  week: HydrationPeriodSummary;
  month: HydrationPeriodSummary;
  quarter: HydrationQuarterSummary;
  year: HydrationYearSummary;
}

/** One "this goal applies from this local date onward, until superseded" record. */
export interface HydrationGoalHistoryEntry {
  id: string;
  goalMl: number;
  effectiveFrom: string;
  createdAt: string;
  updatedAt: string;
}
export type HydrationGoalApplyMode = 'today' | 'tomorrow' | 'all';

export type HydrationPeriodKind = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';
export type HydrationGroupBy = 'entries' | 'day' | 'week' | 'month' | 'quarter' | 'year';
export type HydrationSortBy = 'newest' | 'oldest' | 'highest' | 'lowest' | 'bestCompletion' | 'lowestCompletion';

export type HydrationCalendarDayState = 'none' | 'below-half' | 'partial' | 'goal-met' | 'above-goal';
export interface HydrationCalendarDay { dateKey: string; totalMl: number; goalMl: number; percent: number; state: HydrationCalendarDayState; }
