# Architecture Decisions

## 1. SQLite for primary local data

**Decision:** Store exercises, plans, and workouts in SQLite. **Context:** Relational workout data needs joins, transactions, constraints, and offline persistence. **Reason:** SQLite provides these on device without a server. **Consequences:** Migrations and row mapping are required, but data remains fast and private.

## 2. AsyncStorage only for lightweight preferences

**Decision:** Limit AsyncStorage to small UI preferences and recoverable timer state. **Context:** It does not provide relational integrity. **Reason:** SQLite is the safer primary store. **Consequences:** Settings may use two stores based on responsibility; workout truth never depends on AsyncStorage.

## 3. No backend in version one

**Decision:** Ship without login, APIs, cloud databases, or sync. **Context:** LiftDG is local-first. **Reason:** This protects privacy and makes the core experience available offline. **Consequences:** Users must later use explicit backup/restore to move data between devices.

## 4. Stable IDs for built-in exercises

**Decision:** Keep deterministic string IDs in seed JSON. **Context:** Plans and history reference exercises across app updates. **Reason:** Stable IDs make idempotent upserts possible. **Consequences:** Published IDs must never be repurposed.

## 5. Versioned database migrations

**Decision:** Apply ordered, immutable migrations tracked by SQLite `user_version`. **Context:** Existing installations must retain data as the schema evolves. **Reason:** Versioning makes upgrades repeatable. **Consequences:** Released migrations are never edited; every change adds a new migration.

## 6. Protected built-in plans

**Decision:** Built-in plans may be duplicated or hidden but not edited/deleted. **Context:** Later seeds may refresh starter templates. **Reason:** Immutable templates prevent user edits from conflicting with updates. **Consequences:** Editing begins by creating a user-owned copy.

## 7. Repository and service separation

**Decision:** Repositories own SQL; services own domain calculations and rules. **Context:** SQL embedded in screens is difficult to test and maintain. **Reason:** Clear boundaries reduce coupling. **Consequences:** Routes call typed APIs and repositories map database rows.

## 8. Immediate active-workout persistence

**Decision:** Persist meaningful workout changes immediately, while SQLite remains authoritative. **Context:** Workouts must survive navigation, backgrounding, and interruption. **Reason:** Memory-only state risks losing training data. **Consequences:** Text inputs save on blur, structured controls save immediately, and rest-timer recovery stores its deadline separately.

## 9. Internal measurement units

**Decision:** Pending. **Context:** The intended convention is kilograms for weight and kilometers for distance. **Reason:** Unit settings and conversions are not implemented, so claiming a storage contract would be inaccurate. **Consequences:** Phase 7 must choose, document, migrate if necessary, and test a canonical representation before unit switching ships.

## 10. Discard active workouts by deletion

**Decision:** A confirmed discard deletes the active workout aggregate. **Context:** Cancelled sessions are not yet exposed in history. **Reason:** This keeps Phase 3 behavior understandable and cascades child cleanup atomically. **Consequences:** Discard is irreversible and requires confirmation; a future cancelled-workout policy would require a new migration/decision.
