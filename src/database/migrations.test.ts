import { describe, expect, it } from 'vitest';

import { DATABASE_VERSION, migrationV3 } from './schema';

describe('database migration compatibility', () => {
  it('advances the schema to version 3', () => expect(DATABASE_VERSION).toBe(3));
  it('adds copied plan targets and set audit fields', () => {
    expect(migrationV3).toContain('target_sets');
    expect(migrationV3).toContain('rest_seconds');
    expect(migrationV3).toContain('created_at TEXT NOT NULL');
  });
  it('enforces one active workout with a partial unique index', () => {
    expect(migrationV3).toContain("UNIQUE INDEX IF NOT EXISTS idx_workouts_single_active");
    expect(migrationV3).toContain("WHERE status = 'active'");
  });
});
