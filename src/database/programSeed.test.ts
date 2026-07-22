import { describe, expect, it } from 'vitest';

import exercises from '@/data/exercises.json';
import programs from '@/data/programs.json';
import starterPlans from '@/data/starterPlans.json';
import type { ProgramTemplateSeed } from '@/types/program';
import type { StarterPlanSeed } from '@/types/workoutPlan';

const programSeeds = programs as ProgramTemplateSeed[];
const planSeeds = starterPlans as StarterPlanSeed[];
const exerciseIds = new Set(exercises.map((exercise) => exercise.id));
const planIds = new Set(planSeeds.map((plan) => plan.id));

describe('program seed data consistency', () => {
  it('every day linked to a plan references a plan that actually exists in starterPlans.json', () => {
    for (const program of programSeeds) {
      for (const day of program.days) {
        if (day.planId) expect(planIds.has(day.planId), `${program.id} day ${day.dayNumber} references missing plan ${day.planId}`).toBe(true);
      }
    }
  });

  it('every week count matches durationWeeks, and week numbers are unique and sequential', () => {
    for (const program of programSeeds) {
      expect(program.weeks).toHaveLength(program.durationWeeks);
      expect(program.weeks.map((week) => week.weekNumber)).toEqual(Array.from({ length: program.durationWeeks }, (_item, index) => index + 1));
    }
  });

  it('every day count matches daysPerWeek, and non-rest days have a plan (or are explicitly optional/rest)', () => {
    for (const program of programSeeds) {
      expect(program.days).toHaveLength(program.daysPerWeek);
      for (const day of program.days) if (!day.isRestDay) expect(day.planId, `${program.id} day ${day.dayNumber} is a training day with no linked plan`).not.toBeNull();
    }
  });

  it('exactly one deload and one assessment week for an 8-week program (Week 4 and Week 8)', () => {
    const shiva = programSeeds.find((program) => program.id === 'program_shiva_strength_athletic');
    expect(shiva?.weeks.filter((week) => week.isDeload).map((week) => week.weekNumber)).toEqual([4]);
    expect(shiva?.weeks.filter((week) => week.isAssessment).map((week) => week.weekNumber)).toEqual([8]);
  });
});

describe('Shiva’s Favorites underlying plans reference real exercises', () => {
  it('every exerciseId used by a program_shiva_* plan exists in exercises.json', () => {
    for (const plan of planSeeds) {
      if (!plan.id.startsWith('program_shiva')) continue;
      for (const item of plan.exercises) expect(exerciseIds.has(item.exerciseId), `${plan.id} references missing exercise ${item.exerciseId}`).toBe(true);
    }
  });
});
