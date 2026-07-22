import type { SQLiteDatabase } from 'expo-sqlite';

import type { ProgramDifficulty } from '@/constants/programDifficulty';
import type { WorkoutPlanType } from '@/constants/workoutPlanTypes';
import type { ProgramDay, ProgramTemplate, ProgramTemplateWithWeeks, ProgramWeek } from '@/types/program';
import type { WorkoutPlan } from '@/types/workoutPlan';

import { getPlanById } from './workoutPlanRepository';

interface ProgramRow {
  id: string; name: string; description: string | null; category: string | null; goal: string | null;
  difficulty: string; duration_weeks: number; days_per_week: number; estimated_session_minutes: number | null;
  equipment_level: string | null; is_builtin: number; is_featured: number; is_favorite: number;
  is_archived: number; version: number; notes: string | null; created_at: string; updated_at: string;
}
interface WeekRow {
  id: string; program_id: string; week_number: number; title: string | null; focus: string | null;
  notes: string | null; is_deload: number; is_assessment: number;
}
interface DayRow {
  id: string; program_week_id: string; day_number: number; day_label: string | null; plan_id: string | null;
  workout_type: string | null; is_rest_day: number; is_optional: number; notes: string | null;
  display_order: number; estimated_duration_minutes: number | null;
}

function mapProgram(row: ProgramRow): ProgramTemplate {
  return {
    id: row.id, name: row.name, description: row.description, category: row.category, goal: row.goal,
    difficulty: row.difficulty as ProgramDifficulty, durationWeeks: row.duration_weeks, daysPerWeek: row.days_per_week,
    estimatedSessionMinutes: row.estimated_session_minutes, equipmentLevel: row.equipment_level,
    isBuiltin: row.is_builtin === 1, isFeatured: row.is_featured === 1, isFavorite: row.is_favorite === 1,
    isArchived: row.is_archived === 1, version: row.version, notes: row.notes,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export async function getAllPrograms(db: SQLiteDatabase): Promise<ProgramTemplate[]> {
  const rows = await db.getAllAsync<ProgramRow>(
    'SELECT * FROM program_templates WHERE is_archived = 0 ORDER BY is_featured DESC, updated_at DESC',
  );
  return rows.map(mapProgram);
}

/** Nests weeks and days, resolving each day's linked plan (deduped — the same plan often repeats across weeks). */
export async function getProgramById(db: SQLiteDatabase, id: string): Promise<ProgramTemplateWithWeeks | null> {
  const programRow = await db.getFirstAsync<ProgramRow>('SELECT * FROM program_templates WHERE id = ?', [id]);
  if (!programRow) return null;
  const weekRows = await db.getAllAsync<WeekRow>(
    'SELECT * FROM program_weeks WHERE program_id = ? ORDER BY week_number', [id],
  );
  const dayRows = await db.getAllAsync<DayRow>(
    `SELECT d.* FROM program_days d JOIN program_weeks w ON w.id = d.program_week_id
     WHERE w.program_id = ? ORDER BY w.week_number, d.display_order`, [id],
  );
  const uniquePlanIds = [...new Set(dayRows.map((row) => row.plan_id).filter((planId): planId is string => planId !== null))];
  const plans = await Promise.all(uniquePlanIds.map((planId) => getPlanById(db, planId)));
  const planById = new Map<string, WorkoutPlan>(plans.filter((plan): plan is NonNullable<typeof plan> => plan !== null).map((plan) => [plan.id, plan]));

  const daysByWeek = new Map<string, ProgramDay[]>();
  for (const row of dayRows) {
    const day: ProgramDay = {
      id: row.id, programWeekId: row.program_week_id, dayNumber: row.day_number, dayLabel: row.day_label,
      planId: row.plan_id, workoutType: row.workout_type as WorkoutPlanType | null,
      isRestDay: row.is_rest_day === 1, isOptional: row.is_optional === 1, notes: row.notes,
      displayOrder: row.display_order, estimatedDurationMinutes: row.estimated_duration_minutes,
      plan: row.plan_id ? planById.get(row.plan_id) ?? null : null,
    };
    const list = daysByWeek.get(row.program_week_id) ?? [];
    list.push(day);
    daysByWeek.set(row.program_week_id, list);
  }

  const weeks: ProgramWeek[] = weekRows.map((row) => ({
    id: row.id, programId: row.program_id, weekNumber: row.week_number, title: row.title, focus: row.focus,
    notes: row.notes, isDeload: row.is_deload === 1, isAssessment: row.is_assessment === 1,
    days: daysByWeek.get(row.id) ?? [],
  }));

  return { ...mapProgram(programRow), weeks };
}
