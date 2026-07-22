import { describe, expect, it } from 'vitest';

import { DATABASE_VERSION, migrationV3, migrationV4, migrationV5, migrationV6, migrationV7, migrationV8, migrationV9, migrationV10, migrationV11, migrationV12, migrationV13, migrationV14, migrationV15, migrationV16, migrationV17, migrationV18, migrationV19, migrationV20 } from './schema';

describe('database migration compatibility', () => {
  it('advances the schema to version 20', () => expect(DATABASE_VERSION).toBe(20));
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
  it('adds a default/saved exercise video library, both cascading with their exercise', () => {
    expect(migrationV10).toContain('CREATE TABLE IF NOT EXISTS exercise_default_videos');
    expect(migrationV10).toContain('CREATE TABLE IF NOT EXISTS exercise_saved_videos');
    expect(migrationV10).toContain('idx_exercise_saved_videos_unique');
    expect(migrationV10).toContain('FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE');
  });
  it('adds a workout_type column to workout_plans, defaulted to strength for existing rows', () => {
    expect(migrationV11).toContain("ADD COLUMN workout_type TEXT NOT NULL DEFAULT 'strength'");
    expect(migrationV11).toContain('idx_workout_plans_workout_type');
  });
  it('adds program_templates/program_weeks/program_days, days linking to workout_plans', () => {
    expect(migrationV12).toContain('CREATE TABLE IF NOT EXISTS program_templates');
    expect(migrationV12).toContain('CREATE TABLE IF NOT EXISTS program_weeks');
    expect(migrationV12).toContain('CREATE TABLE IF NOT EXISTS program_days');
    expect(migrationV12).toContain('idx_program_weeks_unique_number');
    expect(migrationV12).toContain('FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE SET NULL');
    expect(migrationV12).toContain('FOREIGN KEY (program_week_id) REFERENCES program_weeks(id) ON DELETE CASCADE');
  });
  it('adds scheduled_workouts, a one-time calendar item linking a local date to a plan', () => {
    expect(migrationV13).toContain('CREATE TABLE IF NOT EXISTS scheduled_workouts');
    expect(migrationV13).toContain('scheduled_date TEXT NOT NULL');
    expect(migrationV13).toContain("status TEXT NOT NULL DEFAULT 'scheduled'");
    expect(migrationV13).toContain('idx_scheduled_workouts_date');
    expect(migrationV13).toContain('FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE SET NULL');
  });
  it('adds program-link columns to scheduled_workouts for "Start Program"', () => {
    expect(migrationV14).toContain('ADD COLUMN program_id TEXT');
    expect(migrationV14).toContain('ADD COLUMN program_week_number INTEGER');
    expect(migrationV14).toContain('ADD COLUMN program_day_id TEXT');
    expect(migrationV14).toContain('idx_scheduled_workouts_program_id');
  });
  it('adds idempotent session launch metadata', () => {
    expect(migrationV15).toContain('launch_operation_id TEXT');
    expect(migrationV15).toContain('original_snapshot_json TEXT');
    expect(migrationV15).toContain('active_session_id TEXT');
    expect(migrationV15).toContain('idx_workouts_launch_operation');
  });
  it('adds active strength session lifecycle metadata',()=>{expect(migrationV16).toContain('paused_at TEXT');expect(migrationV16).toContain('session_status TEXT');expect(migrationV16).toContain('weight_mode TEXT');});
  it('adds plate calculator profiles and set snapshots',()=>{expect(migrationV17).toContain('CREATE TABLE IF NOT EXISTS bar_profiles');expect(migrationV17).toContain('plate_inventory_items');expect(migrationV17).toContain('bar_snapshot_json TEXT');});
  it('adds idempotent completion audit and quality metadata',()=>{expect(migrationV18).toContain('workout_completion_audit');expect(migrationV18).toContain('completion_operation_id TEXT');expect(migrationV18).toContain('actual_completed_at TEXT');});
  it('adds replacement relations, audits, equipment profiles, and slot metadata',()=>{expect(migrationV19).toContain('exercise_replacement_relations');expect(migrationV19).toContain('exercise_replacement_audits');expect(migrationV19).toContain('equipment_profiles');expect(migrationV19).toContain('original_exercise_id TEXT');});
  it('adds immutable history correction overlays and deletion audits',()=>{expect(migrationV20).toContain('completed_workout_correction_audits');expect(migrationV20).toContain('history_display_name TEXT');expect(migrationV20).toContain('completed_workout_deletion_audits');});
});
