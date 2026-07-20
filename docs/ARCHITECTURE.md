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
- A large in-memory active-workout context is intentionally absent. Active screens reload from SQLite so navigation, backgrounding, and restarts do not lose logged work.
- Settings state is planned for Phase 7.

## Services

Services contain business rules, calculations, snapshot creation, validation-friendly transformations, and multi-entity concepts. `workoutService` calculates completed volume and summaries and copies plan targets by value. `workoutPlanService` handles ordering, display targets, duplication input, and built-in protection.

## Repositories

Repositories own parameterized SQL, row-to-domain mapping, CRUD, and database transactions. Multi-table creation/deletion uses `withExclusiveTransactionAsync`. Raw SQLite errors must be translated before reaching UI.

## Database

`SQLiteProvider` opens `liftdg.db`. Initialization enables WAL and foreign keys, runs numbered migrations, then versioned seeds. Foreign keys protect references; cascading deletes remove owned child rows. Stable seed IDs make updates idempotent.

## Architectural rationale

- SQLite fits structured, relational workout data and transactional autosave while remaining fully offline.
- AsyncStorage is limited to lightweight preferences because it is not a relational source of truth.
- No backend reduces privacy exposure and keeps the first version usable without connectivity.
- Built-in exercises and plans are protected so app updates can refresh templates safely. Users customize copies.
- Migrations are versioned because deployed device databases cannot be recreated on every schema change.
- Seed data uses stable IDs so newer seed versions update records without duplication.
