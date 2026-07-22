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

## 30. Water is stored as flat, timestamped entries, not a daily total

**Decision:** `water_entries` stores one row per logged serving (canonical milliliters, a `logged_at` timestamp) rather than a single running total per day. **Context:** The Home card needs to undo the last serving, the full Water screen needs to delete any individual entry, and every rollup (day/week/month/quarter/year) needs to be derivable without a schema change. **Reason:** Flat entries make "undo last," per-entry deletion, and arbitrary date-range aggregation all straightforward reads/deletes instead of stateful counter math. **Consequences:** Day/period totals are always computed (never stored redundantly), and the daily goal, default serving size, and unit preference live in settings rather than on the table.

## 31. Hydration period targets use a fixed calendar length; averages use elapsed days

**Decision:** Week/month/year rollups target `dailyGoal × the period's full calendar length` (7 for a week; the actual number of days in the month, including leap Februaries; the actual days in the year) even before the period ends, but the displayed **average** and **goal-days** count only look at days that have already occurred. "Last 3 Months" is a rolling 90-ish-day window ending today (not a fixed calendar quarter), so its target/average use the rolling window's day count directly. **Context:** A partial "this month" needs both an honest completion percentage against the full month and a meaningful "your average so far" number — a single elapsed-only or full-period-only denominator can't give both. **Reason:** Splitting the two denominators keeps each number correct for what it claims to show, and is simple to test deterministically (see `hydrationService.test.ts`). **Consequences:** Early in a period, the completion percentage against the full-length target will look proportionally low even if the daily average is on track — expected, not a bug.

## 32. Hydration streaks and "goal days" are goal-met days, not logged days

**Decision:** A hydration "goal day," for both the Year section's streak counters and each period's "Goal Days" count, is a local calendar day whose total intake meets the daily goal — not merely a day with any entry at all. The current-streak rule mirrors DECISIONS.md #19 (Phase 5 workout streaks): it stays alive through today until a full calendar day is skipped. **Context:** A workout streak rewards showing up; a hydration streak is meant to reward actually reaching the goal, which is the behavior the celebration and milestone messages are already built around. **Reason:** Consistency with the existing, already-documented streak semantics elsewhere in the app, applied to the metric that actually matters for hydration. **Consequences:** Logging a single sip does not keep a streak alive — only meeting the full daily goal does.

## 33. Goal celebration replay guard uses AsyncStorage, not a settings row

**Decision:** The "already celebrated today" marker (`liftdg:hydration:celebrated-date`) is stored in AsyncStorage, not as a typed `AppSettings` value or a SQLite row. **Context:** It is transient, per-day, and irrelevant to backup/restore or cross-device history. **Reason:** This matches the existing convention (DECISIONS.md #2) of using AsyncStorage only for lightweight, recoverable UI state — the same pattern `useRestTimer` already uses. **Consequences:** Restoring a backup or reinstalling the app resets the celebration guard (harmless — it only ever suppresses a replay, it never blocks the feature).

## 34. A scoped `useAppColors` hook, not an app-wide light-mode retrofit

**Decision:** Phase 10 adds `lightColors` alongside the existing dark `colors` constant and a `useAppColors()` hook that resolves the active palette from `settings.theme`, used only by the new hydration components. **Context:** `settings.theme` already supports `light`, and `AppThemeProvider` already builds a light React Navigation theme, but almost every existing screen still imports the static dark `colors` constant directly, so choosing "light" today only changes navigation chrome, not screen content. **Reason:** Retrofitting every existing screen to be theme-reactive is a large, separate effort outside this feature's scope; scoping the fix to the new components satisfies this feature's explicit light/dark requirement without touching unrelated screens. **Consequences:** The Home Water Card and the full Water screen's own content correctly follow light/dark mode; the surrounding screen chrome (e.g. `AppScreen`'s safe-area background, `Header` text) remains dark-styled like the rest of the app until a broader theming pass adopts `useAppColors` everywhere.

## 35. Hydration goal history: date-keyed rows, lazy backfill, and a sentinel "beginning of time"

**Decision:** `hydration_goal_history` rows are keyed by a local date string (`effective_from`, not an instant) and resolved by `resolveGoalForDate` (last row on or before the date, else the current settings goal). The very first goal change lazily backfills the *old* goal at a sentinel date `0001-01-01` before writing the new one; "apply to all history" instead clears history and re-seeds that same sentinel with the new goal. **Context:** Before Phase 10's overhaul, only a single current goal existed, so there was no record of what earlier goals were — retroactively resolving history needed a defined starting point that doesn't require knowing the user's actual "hydration start date." **Reason:** A sentinel far in the past always resolves correctly for any real logged date without special-casing "no history yet," and lazy backfill means users who never touch the goal setting pay no migration cost. **Consequences:** `hydration_goal_history` can contain a row with an unrealistic `effective_from`; this is intentional and only ever compared against real dates, never displayed to the user.

## 36. The historical Water page uses fixed calendar blocks; the Home carousel stays a rolling window

**Decision:** The Home card's carousel "Last 3 Months" page is always a rolling 90-ish-day window ending today (`summarizeQuarter`). The full Water page's "3 Months" period, when browsing history, is instead a fixed 3-calendar-month block (the reference month plus the two before it) that Previous/Next step through three months at a time (`periodBoundsFor`/`stepPeriod`). **Context:** A glanceable Home summary should always answer "how am I doing lately"; a history browser needs stable, predictable blocks a user can step through and land back on later (e.g. "Jan–Mar 2026"). **Reason:** One rule per surface, each fit to what that surface is for, is simpler to reason about than a single mode trying to serve both. **Consequences:** The two "3 months" figures can differ if viewed on the same day — documented here so it reads as intentional, not inconsistent.

## 37. Editing or backdating a water entry marks it `edited`; entries are never truly anonymous

**Decision:** `water_entries.source` records provenance (`quick_add`, `custom_add`, `edited`, `imported`); saving through `HydrationEntryEditor` always sets it to `edited`, even if only the note changed. **Context:** The historical page's optional source filter and CSV exports are more useful if a user can see which entries were adjusted after the fact. **Reason:** A single provenance field is enough signal without a full edit-history log, which this feature doesn't need. **Consequences:** There's no way to distinguish "amount corrected" from "note added later" from `source` alone — only that *something* was edited.

## 38. Resetting hydration data requires typed confirmation, a second alert, and never touches other data

**Decision:** `/settings/hydration-reset` requires typing the literal string `HYDRATION` (trimmed of only leading/trailing whitespace, case-sensitive) before its delete button enables, then a second native confirmation alert before any deletion runs. Resetting deletes only `water_entries`, `hydration_goal_history`, and the AsyncStorage celebration-guard key; hydration *settings* (goal, serving, unit, celebration style) are reset only if the user explicitly opts in via a checkbox. **Context:** Hydration history can span years and, unlike most other destructive actions in the app, had only a single-tap confirmation before this change. **Reason:** Typed confirmation plus a second alert matches the severity of permanently losing years of logged data, while scoping deletion tightly (and making settings-reset opt-in) keeps the blast radius exactly as small as the user intends. **Consequences:** Resetting is deliberately slower than other deletions in the app (e.g. deleting a single workout) — this is intentional friction, not an oversight.

## 39. "Search YouTube" hands off to youtube.com instead of an in-app API search

**Decision:** "Search YouTube" opens `youtube.com/results` in the system browser (`openYouTubeSearchExternally`, pre-filled with "{Exercise} Proper Form") rather than calling the YouTube Data API v3 from inside the app. There is no API key screen, no in-app results list, and no key stored anywhere. **Context:** An earlier version of this feature required each user to create their own free Google Cloud API key and paste it into a Settings screen so in-app search results could be fetched directly. In practice that setup step was confusing and high-friction for a personal-use app, and the key itself (masked, hard to verify, another thing to manage in SecureStore) added complexity out of proportion to the value of seeing results one tap earlier. **Reason:** youtube.com's own search is already excellent, requires zero setup, and works immediately for every user; "Add YouTube Link" (keyless oEmbed lookup) remains the way to bring a video found there back into LiftDG. **Consequences:** There is no in-app video search UI or results list — finding a video is a hand-off to the browser, and saving it back is a separate explicit step. This removes `youtubeApiKeyService`, the Settings → Video Library screen, and `searchYouTubeVideos`/duration-parsing from `youtubeApiService`/`youtubeService`, superseding this decision's original text.

## 40. Default exercise videos start empty and are only added from verified links; no fabricated YouTube IDs

**Decision:** `exercise_default_videos` seeds from `src/data/exerciseVideos.json`, which started as `[]` and only ever gains entries the user has explicitly provided a real YouTube link for (title/channel confirmed via oEmbed, not guessed) — never a video ID picked or invented without that verification. The schema and seeding pipeline are version-gated (`EXERCISE_VIDEO_SEED_VERSION`, like the exercise/starter-plan seeds) so adding entries later re-seeds existing installs without duplicating rows (`ON CONFLICT(exercise_id, video_id)` upsert). **Context:** A real default-video library needs verified, currently-live YouTube video IDs per exercise; guessing or fabricating IDs would silently ship broken links or, worse, link to unrelated real videos. **Reason:** Shipping infrastructure without unverifiable content is safer than shipping content that might be wrong — the JSON file is the single place curated entries get added, one verified link at a time. **Consequences:** Most exercises' "Default Videos" section remains empty until a verified link is added for that specific exercise; "My Saved Videos" (user-added, via search or pasted link) is fully functional regardless and is not affected by this gap.

## 41. One favorite per exercise, enforced by clear-then-set, not a partial unique index

**Decision:** `exercise_saved_videos.is_favorite` has no database constraint limiting it to one row per exercise; instead, `exerciseVideoRepository.toggleFavoriteVideo` always clears every favorite for the exercise inside a transaction, then re-sets only the target row, and only if it was not already the favorite (so tapping the current favorite un-favorites it rather than being a no-op). **Context:** SQLite partial unique indexes (`WHERE is_favorite = 1`) could enforce this at the schema level, but a transactional clear-then-set was simpler to reason about alongside the toggle-off requirement ("mark ONE saved video as favorite," not "always exactly one"). **Reason:** The toggle behavior (favorite → tap again → no favorite) doesn't map cleanly onto a hard "exactly one" constraint, since zero favorites is a valid state. **Consequences:** Correctness depends on always going through `toggleFavoriteVideo` rather than a raw `UPDATE`; this is the only write path exposed for favoriting, so that's enforced by convention, not the schema.

## 42. There is no embedded in-app YouTube player; "Watch" always opens YouTube

**Decision:** `ExerciseVideoCard` has a single "Watch on YouTube" action (`openYouTubeVideoExternally`) that opens the installed YouTube app, falling back to the system browser. There is no `WebView`-based in-app player, and `react-native-webview` is not a dependency. **Context:** Two separate attempts at an embedded player were built and shipped: first, a `WebView` loading a locally-built HTML string that bootstrapped the YouTube IFrame Player API and reported state via `postMessage`; then, after that proved unreliable (its "ready" handshake could stall indefinitely inside a `WebView`), a `WebView` navigating directly to YouTube's real `https://www.youtube.com/embed/{videoId}` page, with an explicit mobile `userAgent` and cookie settings to work around YouTube's WebView bot detection. Both were verified clean in code review and automated tests, but on the user's actual device, the second attempt still failed to play any video at all (not a subset — every video, on an unrestricted network), consistent with community reports of YouTube's embedded player broadly rejecting non-browser WebView playback. **Reason:** Two independent, individually well-reasoned fixes both failing identically on-device means further WebView-level tweaks would be guesswork with no way to verify them without the same device; a guaranteed-reliable hand-off to the real YouTube app/browser is worth more than an in-app player that may not play anything. **Consequences:** Watching a video always leaves LiftDG momentarily; there is no in-app playback, fullscreen, or embedding-disabled/unavailable state to handle, so `YouTubePlayerModal` and the fullscreen/error-fallback logic it contained were deleted entirely rather than kept as dead code.
