import { describe, expect, it } from 'vitest';

import { DATABASE_VERSION, migrationV3, migrationV4, migrationV5, migrationV6, migrationV7, migrationV8, migrationV9 } from './schema';

describe('database migration compatibility', () => {
  it('advances the schema to version 9', () => expect(DATABASE_VERSION).toBe(9));
  it('adds copied plan targets and set audit fields', () => {
    expect(migrationV3).toContain('target_sets');
    expect(migrationV3).toContain('rest_seconds');
    expect(migrationV3).toContain('created_at TEXT NOT NULL');
  });
  it('enforces one active workout with a partial unique index', () => {
    expect(migrationV3).toContain("UNIQUE INDEX IF NOT EXISTS idx_workouts_single_active");
    expect(migrationV3).toContain("WHERE status = 'active'");
  });
  it('indexes completed workout history', () => expect(migrationV4).toContain('idx_workouts_completed_at'));
  it('adds personal-record audit columns and a per-workout unique index', () => {
    expect(migrationV5).toContain('secondary_value REAL');
    expect(migrationV5).toContain('created_at TEXT NOT NULL');
    expect(migrationV5).toContain('idx_personal_records_unique_value');
    expect(migrationV5).toContain('exercise_id, record_type, value, workout_id');
  });
  it('indexes personal records by type, achieved date, and workout', () => {
    expect(migrationV5).toContain('idx_personal_records_record_type');
    expect(migrationV5).toContain('idx_personal_records_achieved_at');
    expect(migrationV5).toContain('idx_personal_records_workout_id');
  });
  it('adds advanced sets, workout/plan groups, and extended cardio', () => {
    expect(migrationV6).toContain('CREATE TABLE IF NOT EXISTS workout_groups');
    expect(migrationV6).toContain('CREATE TABLE IF NOT EXISTS plan_groups');
    expect(migrationV6).toContain('assistance_weight');
    expect(migrationV6).toContain('workout_exercise_id TEXT REFERENCES');
  });
  it('adds profile, weight, and normalized body measurements',()=>{expect(migrationV7).toContain('CREATE TABLE IF NOT EXISTS user_profile');expect(migrationV7).toContain('CREATE TABLE IF NOT EXISTS body_weight_entries');expect(migrationV7).toContain('UNIQUE(entry_id, measurement_type_id)');expect(migrationV7).toContain('Left calf');});
  it('adds a water_entries table indexed by logged time', () => {
    expect(migrationV8).toContain('CREATE TABLE IF NOT EXISTS water_entries');
    expect(migrationV8).toContain('amount_ml REAL NOT NULL');
    expect(migrationV8).toContain('idx_water_entries_logged_at');
  });
  it('adds water-entry provenance and a goal-history table keyed by effective date', () => {
    expect(migrationV9).toContain("ADD COLUMN source TEXT NOT NULL DEFAULT 'quick_add'");
    expect(migrationV9).toContain('CREATE TABLE IF NOT EXISTS hydration_goal_history');
    expect(migrationV9).toContain('idx_hydration_goal_history_unique_date');
  });
});
