# Feature status

- ✅ Complete — Training Calendar month planner with local-date grid queries, Monday/Sunday preference, previous/next/Today navigation, direct month/year selection, selected-day workout details, and date-prefilled Add Workout

- 🚧 In progress — Training History has paginated list, calendar, and timeline views; expanded completed details; planned-versus-performed structure; repeat/duplicate actions; immutable performed values; audited metadata corrections; and audited deletion. Dedicated exercise/PR/program-history navigation and soft-delete restore remain planned.

- 🚧 In progress — Exercise replacement supports deterministic active-session recommendations, equipment filtering, restrictions, reasons, safe set transfer, group preservation, and audit rows. Scheduled/program/template scope UI, preference editors, and revert UI remain planned.

- ✅ Complete — Dedicated finish review with blocking validation, acknowledged warnings, complete/partial/empty quality, atomic Calendar reconciliation, and idempotent completion audit
- ⚠️ Needs improvement — Active-program lifecycle progress, notification cleanup, and planned-versus-performed history UI remain constrained by their earlier foundation phases

- ✅ Complete — Quantity-aware pound/kilogram plate calculator, built-in bars and inventories, closest modes, visualization, warm-up preview, and active-set snapshot application
- ⚠️ Needs improvement — Custom profile editors, presets, manual/asymmetric loading, and inserting generated warm-ups into templates remain planned

- ✅ Complete — Active strength logging with persisted pause/resume time, session exercise status, typed add-set actions, immediate autosave, previous performance, grouped navigation, and recoverable rest timers
- ⚠️ Needs improvement — Planned/performed comparison, advanced replacement, wake-lock integration, and notification-backed rest alerts remain deferred

- ✅ Complete — Focused Start Workout landing page with active-session recovery, all local-today occurrences, previews, quick starts, recent workout, and lazy workout-library loading
- ✅ Complete — Immutable, versioned launch snapshots; typed launch sources; transaction-safe scheduled status links; duplicate-start protection
- ⚠️ Needs improvement — Start Early supports moving one occurrence or starting an extra copy, but recurring edit scopes, an ActiveProgram lifecycle, and reminder notifications do not yet exist in the underlying phases

- ✅ Complete — Navigation
- ✅ Complete — SQLite initialization and versioned migrations
- ✅ Complete — Exercise library
- ✅ Complete — Exercise search
- ✅ Complete — Category, equipment, and type filters
- ✅ Complete — Exercise details
- ✅ Complete — Custom exercise create/edit/archive
- ✅ Complete — Workout plans
- ✅ Complete — Eight starter plans
- ✅ Complete — Plan duplication
- ✅ Complete — User-plan editing and ordering
- ✅ Complete — Plan detail screen shows usage history (times used, last performed, and a card per past completed workout, tapping through to its full details)
- ✅ Complete — Every plan can be tagged with a workout type (Strength/Running/Cycling/Swimming/Walking/Yoga/Mobility/HIIT/Hybrid/Other), shown as a badge; only Strength has a dedicated exercise editor today
- ✅ Complete — Programs: 11 built-in programs plus a custom-program builder with configurable weeks, weekly training days, and linked workouts; calendar-based start-date selection and safe cancellation of each scheduled run. Pause/resume lifecycle remains planned.
- ⚠️ Needs improvement — Calendar: premium month-grid scheduling of plans plus "Start Program" bulk scheduling. It supports direct month/year selection and selected-day details; Week view, drag-and-drop, conflict resolution, recurring-edit scopes, and notifications remain planned.
- ⚠️ Needs improvement — Apply Changes: on a completed workout, review and apply an exercise replacement back to the source workout template. Only one change type and two scopes exist; see DECISIONS.md #48
- ✅ Complete — Active workout logging and immediate persistence
- ✅ Complete — Unified active-workout list, focused exercise mode, jump picker, previous/next navigation, and persisted focus recovery
- ✅ Complete — Superset/giant-set ordering and round-aware circuit navigation
- ✅ Complete — Optional cancellable auto-advance and persistent rest-timer indicator
- ✅ Complete — Recoverable rest timer
- ✅ Complete — Workout summary and full completed-workout details
- ✅ Complete — Paginated workout history, search, filters, sorting, and date grouping
- ✅ Complete — Repeat, duplicate-as-plan, completed-workout editing, and deletion
- ✅ Complete — Statistics and progress
- ✅ Complete — Personal records
- ✅ Complete — Standalone cardio form, recoverable timer, pace/speed, summaries, and records
- ✅ Complete — Mixed-workout cardio finishers and automatic workout-type derivation
- ✅ Complete — Persisted superset, giant-set, circuit, and plan-group structures
- ⚠️ Needs improvement — Guided circuits and polished multi-stage drop/rest-pause editors
- ✅ Complete — Timed, AMRAP, bodyweight, and assisted set persistence/display
- ✅ Complete — JSON backup validation and transactional merge/replace restore
- ✅ Complete — Workouts, sets, exercises, cardio, and personal-record CSV export
- ✅ Complete — Settings, units, data summary, selective deletion, and protected reset
- ⚠️ Needs improvement — Navigation responds to theme; older visual components retain their dark palette
- ⚠️ Needs improvement — App lock requires native-device Face ID/Touch ID verification
- ✅ Complete — Consistent dark fitness theme
- ✅ Complete — Versioned onboarding with explicit optional sample data
- ✅ Complete — EAS profiles, CI checks, local privacy-filtered logging, and release drafts
- ✅ Complete — Optional local profile with date of birth, canonical centimeter height, and current weight
- ✅ Complete — Body-weight history, measurement sessions, configurable measurement types, comparisons, and charts
- ✅ Complete — Profile/body backup format 2, backward-compatible format-1 restore, CSV reports, and reset integration
- ⚠️ Needs improvement — Physical-device accessibility, backup, biometric, and large-data testing
- ✅ Complete — Home hydration card with quick add/undo, a serving-size hint, a quick-add sheet, milestone messages, and once-daily goal celebration
- ✅ Complete — Swipeable Home hydration analytics carousel (week/month/3-months/year) with animated pagination dots
- ✅ Complete — Custom hydration goal/serving entry with validation, unusual-value confirmation, and goal-history-aware historical grading
- ✅ Complete — Full Water page: Day/Week/Month/3-Months/Year/Custom navigation, grouping/sorting, summary cards, history chart, monthly calendar, and per-date entry add/edit/delete
- ✅ Complete — Hydration settings (daily goal, default serving, units, celebration style, remembered expansion) and a typed-confirmation, double-confirmed reset with optional export
- ✅ Complete — Exercise video library: Default Videos (hidden automatically when empty, and hideable app-wide via Settings) + My Saved Videos (add, rename, favorite, reorder, delete), each with a "Watch on YouTube" action that opens the installed app or browser (no in-app embedded player — see DECISIONS.md #42)
- ✅ Complete — "Search YouTube" (hands off to youtube.com, zero setup) and "Add YouTube Link" (keyless oEmbed lookup) for saving technique videos
- ⚠️ Needs improvement — Default (curated) exercise videos: two verified links added so far (Goblet Squat, Ab Wheel Rollout); nearly every other exercise still has none

Phase 6 uses real persisted rows and repository transactions. It is not marked fully complete because the advanced stage editors and guided circuit experience do not yet cover every requested interaction.
