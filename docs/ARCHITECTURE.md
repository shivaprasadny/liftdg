# Architecture

## Dependency direction

```text
Routes and screens
  → reusable components
  → hooks and contexts
  → services
  → repositories
  → SQLite
```

Dependencies should point downward. Visual components never execute SQL, and repositories do not import route components.

## Routes and screens

`src/app` contains Expo Router routes. Screens render state, handle user interaction and navigation, and call hooks, services, or repositories. They should not contain SQL or durable business rules. Tabs live in `src/app/(tabs)`; entity workflows use `exercises/`, `plans/`, and `workout/` routes.

## Components

`src/components` contains reusable UI: inputs, buttons, cards, plan editors, workout set rows, and the rest timer. Components accept typed data and callbacks. They do not know how data is stored.

## Hooks and contexts

- `DatabaseContext` exposes a ready SQLite connection and a safe initialization fallback.
- `PlanDraftContext` coordinates a temporary plan form across selection routes; SQLite remains authoritative after save.
- `useRestTimer` recovers a small timer preference from AsyncStorage. It does not store workout sets.
- `useExerciseNavigation` projects the ordered SQLite workout exercises into list/focused UI state. The focused exercise is identified by ID (never index), and its lightweight resume position is stored in AsyncStorage; exercise and set data remain in SQLite.
- A large in-memory active-workout context is intentionally absent. Active screens reload from SQLite so navigation, backgrounding, and restarts do not lose logged work.
- `SettingsContext` loads typed durable preferences from SQLite. `ThemeContext` maps system/light/dark into React Navigation. SecureStore contains only app-lock configuration.
- `useAppColors` resolves `settings.theme` (plus the system scheme) to either `colors` or `lightColors` from `constants/colors`. Most existing screens still import the dark `colors` constant directly (a pre-existing gap); Phase 10's hydration components are the first to read colors through this hook so they honor light mode.

## Services

Services contain business rules, calculations, snapshot creation, validation-friendly transformations, and multi-entity concepts. `workoutService` calculates completed volume and summaries and copies plan targets by value. `workoutPlanService` handles ordering, display targets, duplication input, and built-in protection. `workoutHistoryService` owns local-time grouping and history transformations. `cardioService` owns validation, kilometer-based pace/speed calculations, summaries, and workout-type derivation. `advancedSetService` owns group conversion, stage aggregation, AMRAP/timed validation, and bodyweight display/volume rules. `statisticsService` owns date-range/comparison math, streak calculation, per-workout chart aggregation (shared by exercise-progress charts and personal-record detection), and kg display formatting. `personalRecordService` owns personal-record candidate detection, the full-history recalculation used after completing/editing/deleting a workout (see DECISIONS.md #18), and the one-time backfill for pre-Phase-5 history.

`exerciseNavigationService` is the pure ordering boundary for active workouts. It counts only `workout_exercises`, overlays group membership without creating a second list, loops circuit members by round, and recovers focus after reorder or deletion. Set stages and rest-pause attempts never become navigation entries.

Phase 9 adds a normalized body-progress aggregate. `userProfileRepository` owns the single stable local profile, `bodyWeightRepository` owns weight history and current-weight synchronization, `bodyMeasurementRepository` transactionally owns sessions and values, and `measurementTypeRepository` changes visibility without deleting history. `bodyMeasurementService` owns validation, cm/in and height conversion, comparisons, left/right averaging, and chart-ready points. Routes never execute SQL.

Phase 10 adds `hydrationService`, a pure calculation layer over flat `water_entries` rows: unit conversion/formatting (canonical ml ↔ display L/fl oz), day/week/month/quarter/year rollups with a fixed calendar-length goal target and elapsed-day average (DECISIONS.md #31), goal-day streaks (#32), milestone/encouraging messages, glass-count math, and goal-history resolution (`resolveGoalForDate`/`goalResolverFromHistory`, DECISIONS.md #35). The Home `HydrationCard` fetches one bounded window of entries (year-to-date, widened to cover the rolling 3-month window) and derives its "today" card plus a swipeable week/month/quarter/year carousel from that array via `useMemo`. The full Water screen instead loads the complete `water_entries` history (bounded practically by realistic years-of-data volume) so it can navigate to any past day/week/month/quarter/year/custom range, each summarized goal-history-aware via `summarizeHistoricalPeriod`/`periodBoundsFor` — a fixed calendar-block model distinct from the Home carousel's simpler always-"ending today" rolling window (DECISIONS.md #36).

## Repositories

Repositories own parameterized SQL, row-to-domain mapping, CRUD, and database transactions. History queries return bounded aggregate pages; relational search, repeat, completed editing, plan duplication, cascade deletion, and previous-performance lookup remain outside routes. Multi-table creation/deletion uses `withExclusiveTransactionAsync`. Raw SQLite errors must be translated before reaching UI. `statisticsRepository` keeps SQL-level aggregation (`SUM`/`COUNT`/`MAX`/`GROUP BY`) in the database for totals, frequency, volume, most-trained, and muscle-group queries, and composes those with `statisticsService` calculations for higher-level reads like `getStatisticsSummary` and `getExerciseProgressDetail`. `personalRecordRepository` owns personal-record CRUD, dedup checks, and workout/exercise-scoped lookups; `workoutRepository.finishWorkout`/`updateCompletedWorkout`/`deleteWorkout` call `personalRecordService` to keep records in sync after each mutation, catching (and dev-logging) recalculation failures so they never undo an already-successful workout change. `waterEntryRepository` is intentionally thin (create/update/delete/range-query only); all day/week/month/quarter/year rollup, navigation, grouping/sorting, and calendar logic lives in `hydrationService` so it stays unit-testable without a database. `hydrationGoalHistoryRepository` owns the small `hydration_goal_history` table and `applyHydrationGoalChange`, which delegates the actual row-planning to the pure `hydrationService.planGoalChangeEntries`.

## Database

Phase 7 file orchestration remains in services: `backupService` serializes supported tables and restores parents before children in one exclusive transaction; `csvService` creates reporting files; `dataManagementRepository` owns destructive database operations. JSON is the only restore format, and CSV never feeds SQLite.

Phase 8 adds a versioned AsyncStorage onboarding gate (UI state only), explicitly optional stable-ID sample rows in SQLite, local integrity diagnostics, and a privacy-filtering logger. Personal-record backfill remains non-blocking and yields between small batches.

`SQLiteProvider` opens `liftdg.db`. Initialization enables WAL and foreign keys, runs numbered migrations, then versioned seeds. Foreign keys protect references; cascading deletes remove owned child rows. Stable seed IDs make updates idempotent.

## Architectural rationale

- SQLite fits structured, relational workout data and transactional autosave while remaining fully offline.
- AsyncStorage is limited to lightweight preferences because it is not a relational source of truth.
- No backend reduces privacy exposure and keeps the first version usable without connectivity.
- Built-in exercises and plans are protected so app updates can refresh templates safely. Users customize copies.
- Migrations are versioned because deployed device databases cannot be recreated on every schema change.
- Seed data uses stable IDs so newer seed versions update records without duplication.
