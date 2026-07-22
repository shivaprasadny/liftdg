import type { ProgramDifficulty } from '@/constants/programDifficulty';
import type { WorkoutPlanType } from '@/constants/workoutPlanTypes';

import type { WorkoutPlan } from './workoutPlan';

/**
 * A Program is a multi-week structure whose days link to existing workout_plans as their content
 * (DECISIONS.md #45) — it is not a session, not a schedule, and not a new "workout template" layer.
 */
export interface ProgramTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  goal: string | null;
  difficulty: ProgramDifficulty;
  durationWeeks: number;
  daysPerWeek: number;
  estimatedSessionMinutes: number | null;
  equipmentLevel: string | null;
  isBuiltin: boolean;
  isFeatured: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  version: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramDay {
  id: string;
  programWeekId: string;
  dayNumber: number;
  dayLabel: string | null;
  planId: string | null;
  /** Set even when planId is present, so a deleted/unlinked plan doesn't lose its type at a glance. */
  workoutType: WorkoutPlanType | null;
  isRestDay: boolean;
  isOptional: boolean;
  notes: string | null;
  displayOrder: number;
  estimatedDurationMinutes: number | null;
  /** Present only when planId still resolves to a real plan; null for rest days or a deleted link. */
  plan: WorkoutPlan | null;
}

export interface ProgramWeek {
  id: string;
  programId: string;
  weekNumber: number;
  title: string | null;
  focus: string | null;
  notes: string | null;
  isDeload: boolean;
  isAssessment: boolean;
  days: ProgramDay[];
}

export interface ProgramTemplateWithWeeks extends ProgramTemplate { weeks: ProgramWeek[]; }

/**
 * Seed-file shape for src/data/programs.json; mirrors the exercise/starter-plan seed pattern.
 * `days` is the repeating day pattern applied to every entry in `weeks` — Shiva's Favorites reuses
 * the same 4 plans every week, so hand-listing 32 day rows in JSON would be pure duplication. The
 * real `program_days` table still stores one row per week/day; only this static seed shares a pattern.
 */
export interface ProgramWeekSeed {
  weekNumber: number; title: string | null; focus: string | null; notes: string | null;
  isDeload: boolean; isAssessment: boolean;
}
export interface ProgramDaySeed {
  dayNumber: number; dayLabel: string | null; planId: string | null; workoutType: WorkoutPlanType | null;
  isRestDay: boolean; isOptional: boolean; notes: string | null; estimatedDurationMinutes: number | null;
}
export interface ProgramTemplateSeed {
  id: string; name: string; description: string | null; category: string | null; goal: string | null;
  difficulty: ProgramDifficulty; durationWeeks: number; daysPerWeek: number;
  estimatedSessionMinutes: number | null; equipmentLevel: string | null; isFeatured: boolean; notes: string | null;
  weeks: ProgramWeekSeed[]; days: ProgramDaySeed[];
}
