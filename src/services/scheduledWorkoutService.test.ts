import { describe, expect, it } from 'vitest';

import { calculateProgramEndDate, calculateProgramOccurrenceDate, compareScheduledWorkouts, groupScheduledWorkoutsByDate, isoToScheduledDateDisplay, maskScheduledDateInput, scheduledDateDisplayToIso } from './scheduledWorkoutService';
import type { ScheduledWorkout } from '@/types/scheduledWorkout';

const base: ScheduledWorkout = {
  id: 'a', planId: 'plan-1', scheduledDate: '2026-07-27', daypart: null, startTime: null,
  snapshotName: 'Push and Core', snapshotWorkoutType: 'strength', estimatedDurationMinutes: null,
  status: 'scheduled', notes: null, programId: null, programWeekNumber: null, programDayId: null,
  createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z',
};

describe('maskScheduledDateInput', () => {
  it('auto-inserts slashes', () => { expect(maskScheduledDateInput('1')).toBe('1'); expect(maskScheduledDateInput('07')).toBe('07/'); expect(maskScheduledDateInput('0727')).toBe('07/27/'); expect(maskScheduledDateInput('07272026')).toBe('07/27/2026'); });
  it('allows backspace across an automatic separator', () => expect(maskScheduledDateInput('07', '07/')).toBe('0'));
});

describe('scheduledDateDisplayToIso / isoToScheduledDateDisplay', () => {
  it('round-trips a valid date', () => { const iso = scheduledDateDisplayToIso('07/27/2026'); expect(iso).toBe('2026-07-27'); expect(isoToScheduledDateDisplay(iso)).toBe('07/27/2026'); });
  it('rejects an incomplete or impossible date', () => { expect(() => scheduledDateDisplayToIso('07/27/')).toThrow(/MM\/DD\/YYYY/); expect(() => scheduledDateDisplayToIso('02/31/2026')).toThrow(/valid date/); });
});

describe('compareScheduledWorkouts', () => {
  it('orders an exact start time before a daypart-only item', () => {
    const timed: ScheduledWorkout = { ...base, id: 'timed', startTime: '06:00' };
    const afternoon: ScheduledWorkout = { ...base, id: 'afternoon', daypart: 'afternoon' };
    expect(compareScheduledWorkouts(timed, afternoon)).toBeLessThan(0);
  });
  it('orders dayparts morning, afternoon, evening, then anytime', () => {
    const morning: ScheduledWorkout = { ...base, id: 'm', daypart: 'morning' };
    const evening: ScheduledWorkout = { ...base, id: 'e', daypart: 'evening' };
    const anytime: ScheduledWorkout = { ...base, id: 'a', daypart: 'anytime' };
    expect(compareScheduledWorkouts(morning, evening)).toBeLessThan(0);
    expect(compareScheduledWorkouts(evening, anytime)).toBeLessThan(0);
  });
  it('falls back to created time when time/daypart are equal', () => {
    const first: ScheduledWorkout = { ...base, id: 'first', createdAt: '2026-07-01T00:00:00.000Z' };
    const second: ScheduledWorkout = { ...base, id: 'second', createdAt: '2026-07-02T00:00:00.000Z' };
    expect(compareScheduledWorkouts(first, second)).toBeLessThan(0);
  });
});

describe('calculateProgramOccurrenceDate', () => {
  it('maps week 1 day 1 to the start date itself', () => expect(calculateProgramOccurrenceDate('2026-07-27', 1, 1)).toBe('2026-07-27'));
  it('maps week 1 day 4 to three days after the start date', () => expect(calculateProgramOccurrenceDate('2026-07-27', 1, 4)).toBe('2026-07-30'));
  it('maps week 2 day 1 to exactly one week after the start date', () => expect(calculateProgramOccurrenceDate('2026-07-27', 2, 1)).toBe('2026-08-03'));
  it('is timezone-safe across a month boundary', () => expect(calculateProgramOccurrenceDate('2026-07-27', 5, 4)).toBe('2026-08-27'));
});

describe('calculateProgramEndDate', () => {
  it('is the last day of the final week for an 8-week program', () => expect(calculateProgramEndDate('2026-07-27', 8)).toBe('2026-09-20'));
  it('is the start date itself for a 1-day, 1-week program', () => expect(calculateProgramEndDate('2026-07-27', 1)).toBe('2026-08-02'));
});

describe('groupScheduledWorkoutsByDate', () => {
  it('groups by date (sorted) and sorts each day’s items', () => {
    const late: ScheduledWorkout = { ...base, id: 'late', scheduledDate: '2026-07-28', startTime: '18:00' };
    const earlyOnLateDay: ScheduledWorkout = { ...base, id: 'early-late-day', scheduledDate: '2026-07-28', startTime: '06:00' };
    const earlierDay: ScheduledWorkout = { ...base, id: 'earlier-day', scheduledDate: '2026-07-27' };
    const sections = groupScheduledWorkoutsByDate([late, earlyOnLateDay, earlierDay]);
    expect(sections.map((section) => section.date)).toEqual(['2026-07-27', '2026-07-28']);
    expect(sections[1].items.map((item) => item.id)).toEqual(['early-late-day', 'late']);
  });
});
