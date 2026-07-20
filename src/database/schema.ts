export const DATABASE_NAME = 'liftdg.db';
export const DATABASE_VERSION = 3;
export const EXERCISE_SEED_VERSION = 2;
export const STARTER_PLAN_SEED_VERSION = 1;

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
