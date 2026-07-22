export const dayparts = ['morning', 'afternoon', 'evening', 'anytime'] as const;
export type Daypart = (typeof dayparts)[number];
export const daypartLabels: Record<Daypart, string> = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening', anytime: 'Anytime' };
/** Display-only defaults (DECISIONS.md #46) — never forces an exact clock time onto a daypart-only item. */
export const daypartDefaultTimes: Record<Daypart, string> = { morning: '08:00', afternoon: '15:00', evening: '19:00', anytime: '23:59' };

export const scheduledWorkoutStatuses = ['scheduled', 'in_progress', 'completed', 'skipped', 'missed', 'cancelled'] as const;
export type ScheduledWorkoutStatus = (typeof scheduledWorkoutStatuses)[number];
