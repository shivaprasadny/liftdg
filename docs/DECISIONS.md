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

**Decision:** Store lifting weight as kilograms and cardio distance as kilometers; convert at input/display boundaries. **Context:** Cardio supports kilometers and miles without rewriting historical rows. **Reason:** One canonical representation prevents unit changes from corrupting totals. **Consequences:** Repositories and displays must use shared conversion helpers; Phase 7 will expose the preference UI.

## 10. Discard active workouts by deletion

**Decision:** A confirmed discard deletes the active workout aggregate. **Context:** Cancelled sessions are not yet exposed in history. **Reason:** This keeps Phase 3 behavior understandable and cascades child cleanup atomically. **Consequences:** Discard is irreversible and requires confirmation; a future cancelled-workout policy would require a new migration/decision.

## 11. Bounded history queries

**Decision:** Load completed history in pages of 20 and reset the page when search, filters, or sorting changes. **Context:** Workout history grows without a natural upper bound. **Reason:** Bounded aggregate queries keep memory and render cost predictable. **Consequences:** The History FlatList incrementally requests pages and prevents overlapping requests.

## 12. Repeat copies values as suggestions

**Decision:** Repeating creates a new active aggregate with new IDs, copied structure/rest/notes, and prior weight/reps on incomplete sets. **Context:** A repeated session must not mutate history or appear already performed. **Reason:** Suggested values reduce entry work while completion remains explicit. **Consequences:** An existing active workout must be resumed or explicitly discarded first.

## 13. Completed-workout replacement and deletion

**Decision:** Completed edits transactionally replace child rows while preserving `completed` status; confirmed deletion removes the parent and relies on foreign-key cascades. **Context:** Multi-table history edits must not leave partial data. **Reason:** Aggregate transactions preserve integrity. **Consequences:** Editing warns about future statistics and deletion has no undo.

## 14. Duplicate workout as user plan

**Decision:** History duplication creates a non-built-in plan whose target sets equal completed sets and whose rep range is the completed minimum/maximum, defaulting to 8–10. **Context:** Historical sessions are useful templates. **Reason:** Derived targets produce a useful editable plan without linking it to history. **Consequences:** The plan has new IDs and future edits cannot change the source workout.

## 15. Advanced set rows and bodyweight volume

**Decision:** Drop and rest-pause stages are individual rows linked by `group_id`; no parent placeholder is persisted. Bodyweight and assistance do not add lifting volume, while explicit added weight does. **Context:** Summaries must not double count grouped effort. **Reason:** Real stage rows keep edits and record detection consistent. **Consequences:** Completed stages can earn records and bodyweight repetitions still count when volume is zero.

## 16. Workout-group conversion

**Decision:** Group membership is separate from exercises. A third superset exercise converts it to a giant set; a giant set shrinking to two becomes a superset and one remaining exercise dissolves the group. **Context:** Ungrouping must never delete logged exercises. **Reason:** Separate membership makes conversion safe. **Consequences:** The current editor converts automatically; confirmation is a remaining UX improvement.

## 17. Cardio pace and records

**Decision:** Pace is duration divided by distance, speed is distance divided by hours, and fastest-pace records require at least 0.5 km. **Context:** Very short distances create misleading records. **Reason:** A minimum distance rejects noisy results. **Consequences:** Lower pace is better; invalid duration or distance produces no pace.

## 18. Independent backup version

**Decision:** JSON backup format version 1 is independent of SQLite schema version 6. **Context:** Portable contracts evolve differently from device migrations. **Reason:** A schema upgrade must not silently invalidate exports. **Consequences:** Unsupported future formats are rejected explicitly.

## 19. Restore conflicts and rollback

**Decision:** Replace restores the validated snapshot; merge matches IDs and updates only when incoming `updated_at` is newer. Both run transactionally after a pre-restore snapshot. **Context:** Partial aggregates corrupt history. **Reason:** Stable IDs and ordered insertion preserve relationships. **Consequences:** Equal/older rows are skipped and failures roll back.

## 20. CSV is reporting-only

**Decision:** CSV uses selected display units and correct escaping but cannot be imported. **Context:** Flat rows cannot represent every relationship safely. **Reason:** JSON is the lossless restore contract. **Consequences:** Spreadsheet edits cannot be restored.

## 21. Device authentication

**Decision:** App lock uses platform authentication and SecureStore, with device fallback where supported. **Context:** LiftDG should not own passwords. **Reason:** Platform authentication is safer and recoverable. **Consequences:** Face ID needs a native build and permission configuration; unavailable biometrics never enable the lock.

## 18. Personal-record recalculation by full deterministic replay

**Decision:** After a workout is completed, edited, or deleted, `personalRecordService.recalculateExerciseRecords` deletes all `personal_records` rows for each affected exercise and replays that exercise's entire completed-workout history in chronological order, inserting a new record every time a workout beats the running best for that record type. **Context:** Editing or deleting a workout can invalidate whichever record it used to hold, and the replacement "next best" can only be found by looking at the remaining history. **Reason:** One deterministic code path (used uniformly for completion, edit, deletion, and backfill) is simpler and less error-prone than maintaining separate incremental-update logic per case, and per-exercise history is small enough that a full replay is cheap. **Consequences:** Every past best is preserved as history rather than only the latest value; a tie (equal value) never creates a duplicate record because the comparison requires a strictly greater value.

## 19. Streak and consistency rules

**Decision:** A "workout day" is a local calendar day with at least one completed workout. The current streak counts consecutive active days ending at the most recent active day, and stays alive through today even if today has no workout logged yet (the day isn't over) — it only resets after a full calendar day is skipped. The longest streak and weekly-average calculations always scan the complete workout history, independent of the Progress tab's selected date-range filter. **Context:** Users who don't train daily should not see a broken streak just because they haven't logged today's session yet, and a "This Month" filter should not truncate a streak that started earlier. **Reason:** A clear, single rule keeps streak behavior predictable and testable. **Consequences:** Weekly consistency (average workouts per week) is reported separately so non-daily training patterns are still represented fairly.

## 20. Statistics date-range comparisons use an equal-length preceding period

**Decision:** For every date-range preset except "All Time," the previous-period comparison window is the immediately preceding span of the same duration (not the previous full calendar unit). **Context:** Presets like "This Week" and "This Month" are partial (start of period to now), so comparing against a full prior calendar week/month would compare unequal durations. **Reason:** An equal-length window gives a fair, easy-to-reason-about comparison. **Consequences:** When there isn't a full previous period of history (e.g. "All Time," or too little history for a custom range), the comparison is hidden rather than shown as a misleading percentage.

## 21. Muscle-group distribution uses each exercise's primary category only

**Decision:** Muscle-group distribution groups completed sets, sessions, and volume by each exercise's single `category` field. **Context:** Exercises store both primary and secondary muscles; attributing one set to every muscle it touches would double- or triple-count volume across categories. **Reason:** Primary-category-only grouping keeps totals additive and simple to reason about. **Consequences:** The distribution undercounts secondary-muscle involvement; a future version could add a fractional or secondary-muscle breakdown as an explicit enhancement.

## 22. Lightweight custom charts over a chart library

**Decision:** Progress charts are a small custom line/bar component built directly on `react-native-svg`, not a third-party charting library. **Context:** Phase 5 needs simple line and bar charts with empty/loading states and basic touch selection; that scope does not need a heavyweight dependency. **Reason:** `react-native-svg` is a single, minimal, Expo-compatible dependency, avoids adding a second charting library on top of any future needs, and keeps chart rendering easy to reason about and fix if it becomes unstable. **Consequences:** Animations and advanced interactions (pinch-zoom, smooth curve interpolation) are intentionally not implemented; screens always have the underlying chart-ready data available even if the chart component itself is replaced later.

## 23. Versioned onboarding and optional samples

**Decision:** Store only onboarding version in AsyncStorage and persist explicitly requested sample workouts in SQLite with stable IDs and clear labels. **Context:** Onboarding is lightweight UI state while workouts require relational integrity. **Reason:** Users must opt in and be able to remove examples safely. **Consequences:** Significant onboarding changes increment the version without forcing unchanged onboarding on existing users.

## 24. Local production logging

**Decision:** Use a local logger with development-only causes and no analytics service. **Context:** Workout and backup data are private. **Reason:** Diagnostics must not create a backend or leak entered values. **Consequences:** Production logs contain curated event names only and are intentionally less detailed.

## 25. Unified active-exercise navigation

**Decision:** Derive one navigation list from saved `workout_exercises` order and identify focus by workout-exercise ID. Group membership decorates those items; it never creates separate strength/cardio arrays or duplicate circuit rows. **Context:** Reordering, deletion, grouped rounds, and app restart make a stored numeric index fragile. **Reason:** Stable IDs preserve focus while the current index can always be recalculated from SQLite-backed data. **Consequences:** Circuit round position is lightweight UI state, drop/rest-pause stages remain inside one exercise, and pending focused inputs are flushed before navigation. Rest timers remain mounted above exercise focus and recover from AsyncStorage.

## 26. Guarded exercise auto-advance

**Decision:** Auto-advance is opt-in and displays a cancellable three-second prompt after an exercise first becomes complete. **Context:** Immediate navigation can surprise a user who is correcting a set. **Reason:** A visible warning preserves speed without taking control away. **Consequences:** It never auto-finishes a workout, it follows group/circuit order, and failed pending-input persistence cancels navigation.

## 27. Canonical body units and normalized measurements

**Decision:** Store height and circumference in centimeters and weight in kilograms. Store left/right body parts as separate measurement types. **Context:** Display units can change repeatedly and asymmetric values matter. **Reason:** Canonical values avoid rounding drift while normalized rows allow configurable types and chart queries. **Consequences:** Conversion occurs only at input/export/display boundaries; averages are derived and never replace original sides.

## 28. Profile weight is a synchronized snapshot

**Decision:** `user_profile.current_weight_kg` is a convenience snapshot derived from the newest historical weight entry. A weight entered in a measurement session creates a linked weight-history row updated/deleted with that session. **Context:** Dashboards need a fast current value without sacrificing history. **Reason:** One transaction keeps both representations consistent. **Consequences:** Backdated edits and deletion trigger synchronization.

## 29. Backup format 2 remains backward compatible

**Decision:** Backup format 2 adds profile and body collections; format-1 files normalize those collections to empty arrays. Built-in measurement types survive replace restore. **Context:** Existing user backups predate Phase 9. **Reason:** Old backups must restore without fabricating personal data or removing built-in definitions. **Consequences:** Future incompatible additions require another explicit format migration.
