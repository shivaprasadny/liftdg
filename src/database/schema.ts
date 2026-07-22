export const DATABASE_NAME = 'liftdg.db';
export const DATABASE_VERSION = 14;
export const EXERCISE_SEED_VERSION = 3;
export const STARTER_PLAN_SEED_VERSION = 2;
export const PERSONAL_RECORD_BACKFILL_VERSION = 1;
export const EXERCISE_VIDEO_SEED_VERSION = 13;
export const PROGRAM_SEED_VERSION = 1;

export const migrationV1 = `
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL COLLATE NOCASE,
  category TEXT NOT NULL,
  primary_muscles TEXT,
  secondary_muscles TEXT,
  equipment TEXT,
  exercise_type TEXT NOT NULL,
  instructions TEXT,
  is_builtin INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises(name);
CREATE INDEX IF NOT EXISTS idx_exercises_category ON exercises(category);

CREATE TABLE IF NOT EXISTS workout_plans (
  id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, description TEXT, color TEXT,
  is_builtin INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS plan_exercises (
  id TEXT PRIMARY KEY NOT NULL, plan_id TEXT NOT NULL, exercise_id TEXT NOT NULL,
  exercise_order INTEGER NOT NULL, target_sets INTEGER, target_reps_min INTEGER,
  target_reps_max INTEGER, target_weight REAL, rest_seconds INTEGER, notes TEXT,
  FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_plan_exercises_plan_id ON plan_exercises(plan_id);

CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY NOT NULL, plan_id TEXT, name TEXT NOT NULL, workout_type TEXT NOT NULL,
  started_at TEXT NOT NULL, completed_at TEXT, duration_seconds INTEGER, notes TEXT,
  status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_workouts_started_at ON workouts(started_at);
CREATE INDEX IF NOT EXISTS idx_workouts_status ON workouts(status);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id TEXT PRIMARY KEY NOT NULL, workout_id TEXT NOT NULL, exercise_id TEXT NOT NULL,
  exercise_order INTEGER NOT NULL, notes TEXT, started_at TEXT, completed_at TEXT,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);

CREATE TABLE IF NOT EXISTS workout_sets (
  id TEXT PRIMARY KEY NOT NULL, workout_exercise_id TEXT NOT NULL, set_number INTEGER NOT NULL,
  weight REAL, reps INTEGER, duration_seconds INTEGER, distance REAL,
  set_type TEXT NOT NULL DEFAULT 'working', rpe REAL, completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT, notes TEXT,
  FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_workout_sets_workout_exercise_id ON workout_sets(workout_exercise_id);

CREATE TABLE IF NOT EXISTS cardio_sessions (
  id TEXT PRIMARY KEY NOT NULL, workout_id TEXT, activity_type TEXT NOT NULL, date TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL, distance REAL, calories INTEGER, average_heart_rate INTEGER,
  max_heart_rate INTEGER, pace_seconds_per_unit INTEGER, notes TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_cardio_sessions_date ON cardio_sessions(date);

CREATE TABLE IF NOT EXISTS personal_records (
  id TEXT PRIMARY KEY NOT NULL, exercise_id TEXT NOT NULL, record_type TEXT NOT NULL,
  value REAL NOT NULL, workout_id TEXT NOT NULL, workout_set_id TEXT, achieved_at TEXT NOT NULL,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
  FOREIGN KEY (workout_set_id) REFERENCES workout_sets(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_personal_records_exercise_id ON personal_records(exercise_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_personal_records_unique_value
  ON personal_records(exercise_id, record_type, value);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL
);
`;

export const migrationV2 = `
ALTER TABLE workout_plans ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_plan_exercises_exercise_id ON plan_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_plans_updated_at ON workout_plans(updated_at);
`;

// Active workouts copy plan targets so later plan edits cannot rewrite workout history.
export const migrationV3 = `
ALTER TABLE workout_exercises ADD COLUMN target_sets INTEGER;
ALTER TABLE workout_exercises ADD COLUMN target_reps_min INTEGER;
ALTER TABLE workout_exercises ADD COLUMN target_reps_max INTEGER;
ALTER TABLE workout_exercises ADD COLUMN target_weight REAL;
ALTER TABLE workout_exercises ADD COLUMN rest_seconds INTEGER;
ALTER TABLE workout_sets ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
ALTER TABLE workout_sets ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
UPDATE workout_sets SET created_at = COALESCE(completed_at, CURRENT_TIMESTAMP),
  updated_at = COALESCE(completed_at, CURRENT_TIMESTAMP)
WHERE created_at = '' OR updated_at = '';
CREATE INDEX IF NOT EXISTS idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_completed ON workout_sets(completed);
CREATE UNIQUE INDEX IF NOT EXISTS idx_workouts_single_active ON workouts(status) WHERE status = 'active';
`;

// Completed-at drives history pagination and local-time grouping after rows are loaded.
export const migrationV4 = `
CREATE INDEX IF NOT EXISTS idx_workouts_completed_at ON workouts(completed_at);
`;

// Phase 5: personal_records gains audit timestamps, a secondary value (e.g. weight for a max-reps
// record), and a per-workout unique index so the same PR is never stored twice for one workout.
export const migrationV5 = `
ALTER TABLE personal_records ADD COLUMN secondary_value REAL;
ALTER TABLE personal_records ADD COLUMN created_at TEXT NOT NULL DEFAULT '';
ALTER TABLE personal_records ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
UPDATE personal_records SET created_at = achieved_at, updated_at = achieved_at
WHERE created_at = '' OR updated_at = '';
DROP INDEX IF EXISTS idx_personal_records_unique_value;
CREATE UNIQUE INDEX IF NOT EXISTS idx_personal_records_unique_value
  ON personal_records(exercise_id, record_type, value, workout_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_record_type ON personal_records(record_type);
CREATE INDEX IF NOT EXISTS idx_personal_records_achieved_at ON personal_records(achieved_at);
CREATE INDEX IF NOT EXISTS idx_personal_records_workout_id ON personal_records(workout_id);
`;

// Phase 6 stores group membership separately so ungrouping never deletes workout exercises.
export const migrationV6 = `
ALTER TABLE workout_sets ADD COLUMN group_id TEXT;
ALTER TABLE workout_sets ADD COLUMN group_type TEXT;
ALTER TABLE workout_sets ADD COLUMN group_order INTEGER;
ALTER TABLE workout_sets ADD COLUMN stage_number INTEGER;
ALTER TABLE workout_sets ADD COLUMN assistance_weight REAL;
ALTER TABLE workout_sets ADD COLUMN bodyweight_value REAL;
ALTER TABLE workout_sets ADD COLUMN added_weight REAL;
ALTER TABLE workout_sets ADD COLUMN round_number INTEGER;
ALTER TABLE workout_sets ADD COLUMN target_duration_seconds INTEGER;
ALTER TABLE workout_sets ADD COLUMN target_distance REAL;
ALTER TABLE workout_sets ADD COLUMN is_amrap INTEGER NOT NULL DEFAULT 0;

ALTER TABLE plan_exercises ADD COLUMN target_duration_seconds INTEGER;
ALTER TABLE plan_exercises ADD COLUMN target_distance REAL;

CREATE TABLE IF NOT EXISTS workout_groups (
  id TEXT PRIMARY KEY NOT NULL, workout_id TEXT NOT NULL, group_type TEXT NOT NULL,
  name TEXT, group_order INTEGER NOT NULL, target_rounds INTEGER,
  completed_rounds INTEGER NOT NULL DEFAULT 0, rest_between_exercises_seconds INTEGER,
  rest_between_rounds_seconds INTEGER, notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS workout_group_exercises (
  id TEXT PRIMARY KEY NOT NULL, group_id TEXT NOT NULL, workout_exercise_id TEXT NOT NULL,
  exercise_order INTEGER NOT NULL, created_at TEXT NOT NULL,
  FOREIGN KEY (group_id) REFERENCES workout_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE,
  UNIQUE(group_id, workout_exercise_id)
);
CREATE TABLE IF NOT EXISTS plan_groups (
  id TEXT PRIMARY KEY NOT NULL, plan_id TEXT NOT NULL, group_type TEXT NOT NULL,
  name TEXT, group_order INTEGER NOT NULL, target_rounds INTEGER,
  rest_between_exercises_seconds INTEGER, rest_between_rounds_seconds INTEGER,
  notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS plan_group_exercises (
  id TEXT PRIMARY KEY NOT NULL, group_id TEXT NOT NULL, plan_exercise_id TEXT NOT NULL,
  exercise_order INTEGER NOT NULL, created_at TEXT NOT NULL,
  FOREIGN KEY (group_id) REFERENCES plan_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_exercise_id) REFERENCES plan_exercises(id) ON DELETE CASCADE,
  UNIQUE(group_id, plan_exercise_id)
);
CREATE TABLE IF NOT EXISTS cardio_personal_records (
  id TEXT PRIMARY KEY NOT NULL, activity_type TEXT NOT NULL, record_type TEXT NOT NULL,
  value REAL NOT NULL, cardio_session_id TEXT NOT NULL, achieved_at TEXT NOT NULL,
  created_at TEXT NOT NULL, UNIQUE(activity_type, record_type, value, cardio_session_id),
  FOREIGN KEY (cardio_session_id) REFERENCES cardio_sessions(id) ON DELETE CASCADE
);

ALTER TABLE cardio_sessions ADD COLUMN workout_exercise_id TEXT REFERENCES workout_exercises(id) ON DELETE CASCADE;
ALTER TABLE cardio_sessions ADD COLUMN elevation_gain REAL;
ALTER TABLE cardio_sessions ADD COLUMN average_pace_seconds_per_unit INTEGER;
ALTER TABLE cardio_sessions ADD COLUMN average_speed REAL;
ALTER TABLE cardio_sessions ADD COLUMN cadence INTEGER;
ALTER TABLE cardio_sessions ADD COLUMN rounds INTEGER;

CREATE INDEX IF NOT EXISTS idx_cardio_sessions_workout_id ON cardio_sessions(workout_id);
CREATE INDEX IF NOT EXISTS idx_cardio_sessions_workout_exercise_id ON cardio_sessions(workout_exercise_id);
CREATE INDEX IF NOT EXISTS idx_cardio_sessions_activity_type ON cardio_sessions(activity_type);
CREATE INDEX IF NOT EXISTS idx_workout_groups_workout_id ON workout_groups(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_group_exercises_group_id ON workout_group_exercises(group_id);
CREATE INDEX IF NOT EXISTS idx_plan_groups_plan_id ON plan_groups(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_group_exercises_group_id ON plan_group_exercises(group_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_group_id ON workout_sets(group_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_round_number ON workout_sets(round_number);
CREATE INDEX IF NOT EXISTS idx_cardio_records_activity ON cardio_personal_records(activity_type,record_type);
`;

// Phase 9 separates profile snapshots, weight history, measurement sessions, and typed values.
export const migrationV7 = `
CREATE TABLE IF NOT EXISTS user_profile (
  id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, date_of_birth TEXT, height_cm REAL,
  current_weight_kg REAL, notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS body_weight_entries (
  id TEXT PRIMARY KEY NOT NULL, profile_id TEXT NOT NULL, weight_kg REAL NOT NULL,
  measured_at TEXT NOT NULL, notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES user_profile(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS measurement_types (
  id TEXT PRIMARY KEY NOT NULL, key TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL,
  category TEXT NOT NULL, default_unit TEXT NOT NULL, is_builtin INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS body_measurement_entries (
  id TEXT PRIMARY KEY NOT NULL, profile_id TEXT NOT NULL, measured_at TEXT NOT NULL,
  body_weight_kg REAL, notes TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY (profile_id) REFERENCES user_profile(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS body_measurement_values (
  id TEXT PRIMARY KEY NOT NULL, entry_id TEXT NOT NULL, measurement_type_id TEXT NOT NULL,
  value_cm REAL NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY (entry_id) REFERENCES body_measurement_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (measurement_type_id) REFERENCES measurement_types(id) ON DELETE RESTRICT,
  UNIQUE(entry_id, measurement_type_id)
);
CREATE INDEX IF NOT EXISTS idx_body_weight_profile ON body_weight_entries(profile_id);
CREATE INDEX IF NOT EXISTS idx_body_weight_measured_at ON body_weight_entries(measured_at);
CREATE INDEX IF NOT EXISTS idx_body_measurement_values_entry ON body_measurement_values(entry_id);
CREATE INDEX IF NOT EXISTS idx_body_measurement_values_type ON body_measurement_values(measurement_type_id);
CREATE INDEX IF NOT EXISTS idx_body_measurement_entries_measured_at ON body_measurement_entries(measured_at);
INSERT OR IGNORE INTO measurement_types (id,key,display_name,category,default_unit,is_builtin,is_active,sort_order,created_at,updated_at) VALUES
('measurement-neck','neck','Neck','Upper body','cm',1,1,10,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('measurement-shoulders','shoulders','Shoulders','Upper body','cm',1,1,20,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('measurement-chest','chest','Chest','Upper body','cm',1,1,30,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('measurement-waist','waist','Waist','Core','cm',1,1,40,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('measurement-abdomen','abdomen','Abdomen','Core','cm',1,0,50,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('measurement-hips','hips','Hips','Core','cm',1,1,60,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('measurement-left-biceps','left_biceps','Left biceps','Upper body','cm',1,1,70,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('measurement-right-biceps','right_biceps','Right biceps','Upper body','cm',1,1,80,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('measurement-left-forearm','left_forearm','Left forearm','Upper body','cm',1,0,90,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('measurement-right-forearm','right_forearm','Right forearm','Upper body','cm',1,0,100,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('measurement-left-thigh','left_thigh','Left thigh','Lower body','cm',1,1,110,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('measurement-right-thigh','right_thigh','Right thigh','Lower body','cm',1,1,120,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('measurement-left-calf','left_calf','Left calf','Lower body','cm',1,1,130,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('measurement-right-calf','right_calf','Right calf','Lower body','cm',1,1,140,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('measurement-glutes','glutes','Glutes','Core','cm',1,0,150,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('measurement-wrist','wrist','Wrist','Upper body','cm',1,0,160,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('measurement-ankle','ankle','Ankle','Lower body','cm',1,0,170,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP);
`;

// Phase 10: water intake is logged as discrete entries in canonical milliliters, timestamped so
// day/week/month/quarter/year rollups can all be derived from one table without redesign.
export const migrationV8 = `
CREATE TABLE IF NOT EXISTS water_entries (
  id TEXT PRIMARY KEY NOT NULL, amount_ml REAL NOT NULL, logged_at TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_water_entries_logged_at ON water_entries(logged_at);
`;

// Adds entry provenance/notes and a goal-history table so a later goal change never rewrites how
// past days are graded. `effective_from` is a local date key (yyyy-MM-dd), not an instant, since
// goal changes are always "starting from this calendar day," never a specific moment.
export const migrationV9 = `
ALTER TABLE water_entries ADD COLUMN source TEXT NOT NULL DEFAULT 'quick_add';
ALTER TABLE water_entries ADD COLUMN notes TEXT;

CREATE TABLE IF NOT EXISTS hydration_goal_history (
  id TEXT PRIMARY KEY NOT NULL, goal_ml REAL NOT NULL, effective_from TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hydration_goal_history_unique_date ON hydration_goal_history(effective_from);
CREATE INDEX IF NOT EXISTS idx_hydration_goal_history_effective_from ON hydration_goal_history(effective_from);
`;

// Exercise video library: curated/default videos are seeded content (never user-editable), while
// saved videos are a fully separate per-exercise, user-owned, reorderable/favoritable collection.
// Both cascade with their exercise so archiving history never leaves orphaned video rows.
export const migrationV10 = `
CREATE TABLE IF NOT EXISTS exercise_default_videos (
  id TEXT PRIMARY KEY NOT NULL, exercise_id TEXT NOT NULL, title TEXT NOT NULL, video_id TEXT NOT NULL,
  channel_name TEXT, thumbnail_url TEXT, sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_exercise_default_videos_exercise_id ON exercise_default_videos(exercise_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercise_default_videos_unique ON exercise_default_videos(exercise_id, video_id);

CREATE TABLE IF NOT EXISTS exercise_saved_videos (
  id TEXT PRIMARY KEY NOT NULL, exercise_id TEXT NOT NULL, video_id TEXT NOT NULL, title TEXT NOT NULL,
  channel_name TEXT, thumbnail_url TEXT, youtube_url TEXT NOT NULL,
  is_favorite INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0, saved_at TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_exercise_saved_videos_exercise_id ON exercise_saved_videos(exercise_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_exercise_saved_videos_unique ON exercise_saved_videos(exercise_id, video_id);
`;

// First foundation step of the "Training" evolution (DECISIONS.md #43/#44): tags each plan with a
// broad workout type. Every existing plan (all strength-only today) safely defaults to 'strength'
// via the column default, so this never changes behavior for existing data. No new tables yet —
// type-specific block/section editors for non-strength types are deferred to a later phase.
export const migrationV11 = `
ALTER TABLE workout_plans ADD COLUMN workout_type TEXT NOT NULL DEFAULT 'strength';
CREATE INDEX IF NOT EXISTS idx_workout_plans_workout_type ON workout_plans(workout_type);
`;

// First real slice of Programs (DECISIONS.md #45): a multi-week structure that links to existing
// workout_plans rows as its daily content, rather than a new parallel "workout template" table.
// Read-only in this pass — no editor, no ActiveProgram/pause/resume, no variants yet.
export const migrationV12 = `
CREATE TABLE IF NOT EXISTS program_templates (
  id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, description TEXT, category TEXT, goal TEXT,
  difficulty TEXT NOT NULL DEFAULT 'intermediate', duration_weeks INTEGER NOT NULL,
  days_per_week INTEGER NOT NULL, estimated_session_minutes INTEGER, equipment_level TEXT,
  is_builtin INTEGER NOT NULL DEFAULT 0, is_featured INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0, is_archived INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1, notes TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_program_templates_updated_at ON program_templates(updated_at);
CREATE INDEX IF NOT EXISTS idx_program_templates_featured ON program_templates(is_featured);

CREATE TABLE IF NOT EXISTS program_weeks (
  id TEXT PRIMARY KEY NOT NULL, program_id TEXT NOT NULL, week_number INTEGER NOT NULL,
  title TEXT, focus TEXT, notes TEXT, is_deload INTEGER NOT NULL DEFAULT 0,
  is_assessment INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY (program_id) REFERENCES program_templates(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_program_weeks_program_id ON program_weeks(program_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_program_weeks_unique_number ON program_weeks(program_id, week_number);

CREATE TABLE IF NOT EXISTS program_days (
  id TEXT PRIMARY KEY NOT NULL, program_week_id TEXT NOT NULL, day_number INTEGER NOT NULL,
  day_label TEXT, plan_id TEXT, workout_type TEXT, is_rest_day INTEGER NOT NULL DEFAULT 0,
  is_optional INTEGER NOT NULL DEFAULT 0, notes TEXT, display_order INTEGER NOT NULL DEFAULT 0,
  estimated_duration_minutes INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY (program_week_id) REFERENCES program_weeks(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_program_days_program_week_id ON program_days(program_week_id);
CREATE INDEX IF NOT EXISTS idx_program_days_plan_id ON program_days(plan_id);
`;

// First real slice of the Training Calendar (DECISIONS.md #46): one-time scheduling of an existing
// plan onto a local calendar date, viewed as a flat agenda. No Month/Week views, no program
// population, no drag-and-drop, no notifications, no conflict detection yet — see the decision for
// why. `scheduled_date` is a plain YYYY-MM-DD string (never a UTC instant) so it can never shift a
// day because of timezone conversion. name/workout_type are snapshotted at schedule time so a later
// plan edit never silently rewrites what was already scheduled.
export const migrationV13 = `
CREATE TABLE IF NOT EXISTS scheduled_workouts (
  id TEXT PRIMARY KEY NOT NULL, plan_id TEXT, scheduled_date TEXT NOT NULL,
  daypart TEXT, start_time TEXT, snapshot_name TEXT NOT NULL, snapshot_workout_type TEXT NOT NULL,
  estimated_duration_minutes INTEGER, status TEXT NOT NULL DEFAULT 'scheduled', notes TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_date ON scheduled_workouts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_plan_id ON scheduled_workouts(plan_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_status ON scheduled_workouts(status);
`;

// Connects Programs to the Calendar (DECISIONS.md #47): "Start Program" bulk-creates one
// scheduled_workouts row per non-rest program day. There is deliberately no `active_programs`
// table/lifecycle (pause/resume/end) yet — `program_id` on the occurrence itself is the only anchor,
// so "program-linked" simply means `program_id IS NOT NULL`. Only one edit scope exists in this
// pass ("this occurrence only"), so there is no override table — editing/removing an occurrence is
// a plain row update/delete, same as an independent scheduled workout.
export const migrationV14 = `
ALTER TABLE scheduled_workouts ADD COLUMN program_id TEXT;
ALTER TABLE scheduled_workouts ADD COLUMN program_week_number INTEGER;
ALTER TABLE scheduled_workouts ADD COLUMN program_day_id TEXT;
CREATE INDEX IF NOT EXISTS idx_scheduled_workouts_program_id ON scheduled_workouts(program_id);
`;
