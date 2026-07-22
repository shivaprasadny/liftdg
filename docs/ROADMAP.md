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

**Goal:** Make daily water tracking a one-tap habit without cluttering Home, and make past hydration history genuinely explorable. **Features:** a single Home Water Card (today's total/goal/percent, animated progress bar, quick add/undo with a long-press preset sheet, percent-based milestone messages, a once-daily goal celebration, a serving-size hint next to the glass count) with a one-tap swipeable week/month/quarter/year analytics carousel and animated pagination dots; custom daily-goal and serving-size entry with ml/L/fl-oz input, range validation, and unusual-value confirmation; goal-history-aware grading so a later goal change never silently rewrites past days; a typed-confirmation, second-alert hydration reset with optional CSV/JSON export first; and a full Water page supporting Day/Week/Month/3-Months/Year/Custom navigation with previous/next stepping, a lightweight date picker, grouping/sorting, summary cards (total, average, goal days, best/lowest day), a history chart, a monthly calendar view, and per-entry add/edit/delete for any date. **Depends on:** Settings (typed preferences, theme), SQLite. **Done when:** schema migrations 8–9 apply safely, entries and goal history persist across restarts, all rollup/navigation/aggregation math is tested (including leap years, goal-history resolution, and chart-aggregation boundaries), the celebration never replays the same day, reset never touches non-hydration data, and the card/full screen honor light and dark mode. **Status:** implemented; physical-device verification remains.

## Phase 11: Exercise Video Library

**Goal:** Let users learn proper technique from YouTube directly inside the exercise library, with both curated and personal videos. **Features:** a per-exercise "Exercise Videos" section (Default Videos, never user-editable, plus My Saved Videos — addable, renamable, favoritable, reorderable, deletable); "Watch on YouTube," which opens the installed YouTube app (falling back to the browser); a "Search YouTube" button pre-filled with "{Exercise} Proper Form" that hands off to youtube.com's own search (zero setup, no API key); and "Add YouTube Link" with keyless oEmbed title/thumbnail lookup. **Depends on:** the exercise library, SQLite. **Done when:** schema migration 10 applies safely, saved videos and their order/favorite/rename survive restart, and URL parsing is tested. **Status:** implemented with an intentionally empty default-video seed (see DECISIONS.md #40); an earlier in-app API-key search was tried and removed in favor of the external hand-off (DECISIONS.md #39); two independent embedded-in-app-player designs (an injected IFrame Player API, then a direct embed-page `WebView` navigation) were each tried and failed to play reliably on a real device, so in-app playback was removed entirely in favor of always opening YouTube (DECISIONS.md #42).
