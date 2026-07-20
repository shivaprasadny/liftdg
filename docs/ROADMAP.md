# Roadmap

## Phase 1: Exercise Library

**Goal:** Establish offline data and exercise management. **Features:** navigation, database initialization, built-ins, search/filter/details, custom exercises. **Depends on:** project scaffold. **Done when:** data seeds once, custom records persist, and checks pass. **Status:** complete.

## Phase 2: Workout Plans

**Goal:** Build reusable workout templates. **Features:** starter/user plans, exercise targets, ordering, edit/duplicate/archive/delete. **Depends on:** exercise IDs and repository layer. **Done when:** plans persist transactionally and built-ins remain protected. **Status:** complete.

## Phase 2.5: Documentation and Cleanup

**Goal:** Make architecture and contribution rules explicit. **Features:** project docs, typed safe errors, comments at important boundaries, schema audit. **Depends on:** stable Phase 1–2 design. **Done when:** docs match code and verification is clean. **Status:** complete.

## Phase 3: Active Workout Logging

**Goal:** Reliably log a live strength workout. **Features:** plan snapshots, empty workouts, immediate set persistence, add/remove/reorder, rest timer, finish/discard, summary. **Depends on:** plans and exercises. **Done when:** one workout survives restart and finishes transactionally. **Status:** complete.

## Phase 4: Workout History

**Goal:** Browse and manage completed workouts. **Features:** grouped history, details, repeat, edit, delete. **Depends on:** completed Phase 3 records. **Done when:** large histories are queryable and mutations are confirmed.

## Phase 5: Progress, Statistics, and Personal Records

**Goal:** Derive useful local insights. **Features:** totals, streaks, exercise trends, PR detection. **Depends on:** trustworthy history. **Done when:** calculations are tested and date filters agree.

## Phase 6: Cardio and Mixed Workouts

**Goal:** Track duration/distance activities. **Features:** cardio forms, pace, mixed sessions, cardio totals. **Depends on:** history/statistics conventions. **Done when:** unit-safe cardio persists and summarizes.

## Phase 7: Settings, Backup, Restore, and CSV Export

**Goal:** User control and portability. **Features:** units, appearance, timers, validated JSON backup/merge/replace, CSV exports. **Depends on:** stable schema. **Done when:** round-trip restore is tested without corruption.

## Phase 8: Testing, Accessibility, Performance, and Release Preparation

**Goal:** Production readiness. **Features:** repository integration tests, migration fixtures, accessibility audit, pagination, performance profiling, store assets. **Depends on:** feature completeness. **Done when:** release checks and device matrices pass.
