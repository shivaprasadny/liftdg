# Roadmap

## Phase 1: Exercise Library

**Goal:** Establish offline data and exercise management. **Features:** navigation, database initialization, built-ins, search/filter/details, custom exercises. **Depends on:** project scaffold. **Done when:** data seeds once, custom records persist, and checks pass. **Status:** complete.

## Phase 2: Workout Plans

**Goal:** Build reusable workout templates. **Features:** starter/user plans, exercise targets, ordering, edit/duplicate/archive/delete. **Depends on:** exercise IDs and repository layer. **Done when:** plans persist transactionally and built-ins remain protected. **Status:** complete.

## Phase 2.5: Documentation and Cleanup

**Goal:** Make architecture and contribution rules explicit. **Features:** project docs, typed safe errors, comments at important boundaries, schema audit. **Depends on:** stable Phase 1–2 design. **Done when:** docs match code and verification is clean. **Status:** complete.

## Phase 3: Active Workout Logging

**Goal:** Reliably log a live strength workout. **Features:** plan snapshots, empty workouts, immediate set persistence, unified list/focused navigation, add/remove/reorder, rest timer, finish/discard, summary. **Depends on:** plans and exercises. **Done when:** one workout and its focused-exercise position survive restart, grouped navigation follows saved order, and the workout finishes transactionally. **Status:** complete.

## Phase 4: Workout History

**Goal:** Browse and manage completed workouts. **Features:** paginated/grouped history, debounced relational search, filters, sorting, details, repeat, duplicate-as-plan, edit, delete, and previous performance. **Depends on:** completed Phase 3 records. **Done when:** large histories are queryable, target snapshots remain stable, and multi-table mutations are confirmed and transactional. **Status:** complete.

## Phase 5: Progress, Statistics, and Personal Records

**Goal:** Derive useful local insights. **Features:** totals, streaks, exercise trends, PR detection. **Depends on:** trustworthy history. **Done when:** calculations are tested and date filters agree. **Status:** complete.

## Phase 6: Cardio and Mixed Workouts

**Goal:** Track cardio and reusable advanced workout structures. **Features:** cardio forms/timer, pace, mixed sessions, groups, advanced set rows, cardio totals and records. **Depends on:** history/statistics conventions. **Done when:** unit-safe cardio persists and summarizes; grouped plans copy by value; advanced entries render without double counting; all requested editor interactions pass device tests. **Status:** in progress — persistence, services, basic screens, and tests are present; guided circuits and full multi-stage editors need polish.

## Phase 7: Settings, Backup, Restore, and CSV Export

**Goal:** User control and portability. **Features:** units, appearance, workout behavior, biometric lock, validated JSON backup/merge/replace, CSV exports, deletion/reset. **Depends on:** stable schema. **Done when:** automated checks pass and native round-trip restore, share-sheet, and biometric checks pass. **Status:** implemented; physical-device verification remains in Phase 8.

## Phase 8: Testing, Accessibility, Performance, and Release Preparation

**Goal:** Production readiness. **Features:** repository integration tests, migration fixtures, accessibility audit, pagination, performance profiling, store assets. **Depends on:** feature completeness. **Done when:** release checks and device matrices pass.

**Status:** in progress. Onboarding, CI/EAS configuration, coverage reporting, integrity diagnostics, logging, and release documentation are implemented. Real-device checks, final branded assets, broader integration coverage, and performance profiling remain.

## Phase 9: Profile and Body Progress

**Goal:** Track optional identity, body weight, and body measurements locally. **Features:** seven-step onboarding profile, editable profile, kg/cm canonical storage, weight history, configurable measurement types, normalized measurement sessions, latest/first/custom comparisons, trends, Home/Progress links, backup format 2, CSV export, and reset. **Depends on:** Settings, SQLite, charts, backup, and app lock. **Done when:** schema migration 7 applies safely, entries survive restart/backup restore, unit changes affect display only, calculations and repositories are tested, and device verification passes. **Status:** implemented; physical-device verification remains.

## Phase 10: Smart Hydration Dashboard

**Goal:** Make daily water tracking a one-tap habit without cluttering Home. **Features:** a single Home Water Card (today's total/goal/percent, animated progress bar, quick add/undo with a long-press preset sheet, percent-based milestone messages, a once-daily goal celebration), a progressive expand/collapse arrow revealing week → month → quarter → year rollups, a full Water screen with today's deletable entry list and always-visible period statistics, and hydration settings (daily goal, default serving, units, celebration style, remembered expansion). **Depends on:** Settings (typed preferences, theme), SQLite. **Done when:** schema migration 8 applies safely, entries persist across restarts, streak/period math is tested (including leap years and unit conversion), the celebration never replays the same day, and the card/full screen honor light and dark mode. **Status:** implemented; physical-device verification remains.
