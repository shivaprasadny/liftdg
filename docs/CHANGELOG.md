# Changelog

## Unreleased

### Added

- Five-tab Expo Router navigation and settings entry point.
- Versioned SQLite initialization, foreign keys, indexes, and idempotent seeds.
- Searchable/filterable built-in and custom exercise library.
- Workout plan creation, editing, ordering, duplication, archival, and starter templates.
- Active strength workouts from plans or an empty session, immediate set persistence, rest timer, finish/discard flow, and summary.
- Unified active-workout list and focused exercise editor with jump picker, previous/next controls, group-aware circuit rounds, focus recovery, and guarded auto-advance preferences.
- Paginated, grouped workout history with debounced search, filters, sorting, and detailed set inspection.
- Repeat workout, duplicate as plan, completed-workout editing/deletion, and active-workout previous performance.
- Project architecture, database, development, feature, roadmap, testing, and decision documentation.
- Progress tab: date-range filtering (week/month/30d/3m/6m/year/all/custom), training overview with previous-period comparisons, workout-consistency streaks, volume trend and workout-frequency charts, exercise-specific progress charts and bests, personal-record list, most-trained-exercise ranking, and muscle-group distribution.
- Strength personal-record detection (max weight, max reps, best set volume, estimated one-rep max via the Epley formula, best workout volume), recalculated after finishing, editing, or deleting a completed workout, plus a one-time backfill for workouts logged before Phase 5.
- Personal-record badges on the workout summary, workout details, Home, and Progress screens.
- Standalone cardio logging/timer, mixed-workout finishers, pace/speed summaries, and cardio progress.
- Workout and plan groups for supersets, giant sets, and circuits.
- Advanced set persistence for drop, rest-pause, timed, AMRAP, assisted, distance, and bodyweight work.
- Typed settings, canonical unit conversion, theme preference, and device-authentication app lock.
- Backup format v1 with validated merge/replace restore and pre-restore snapshots.
- Five CSV reports, data summary, selective deletion, and protected full reset.
- Versioned onboarding with explicit optional sample data.
- Accessibility labels/states and larger filter/reorder touch targets.
- Privacy-filtered logging, integrity diagnostics, and batched record backfill.
- EAS profiles, GitHub Actions quality checks, coverage tooling, and release/store drafts.
- Schema migration 7 with a local profile, weight history, seeded measurement types, normalized body-measurement sessions, comparisons, charts, and preferences.
- Backup format 2 and profile, weight-history, and body-measurement CSV exports.
- Profile step in onboarding plus Body Progress links on Home, Progress, and Settings.
- Home hydration card: today's total/goal/percent, animated progress bar, quick add/undo, a serving-size hint next to the glass count, a long-press quick-add sheet (presets and custom amount), percent-based milestone messages, and a once-per-day goal celebration (checkmark, optional confetti, haptic).
- A one-tap swipeable Home analytics carousel (This Week / This Month / Last 3 Months / This Year) with animated, tappable pagination dots and an optional remembered open/closed state and page.
- Custom daily-goal and serving-size entry (ml/L/US fl oz) with range validation and a confirmation step for unusually low/high values or a serving at/above the daily goal; changing the goal offers "Starting Today," "Starting Tomorrow," or "Apply to All History."
- Hydration goal history, so a later goal change never rewrites how past days are graded.
- A full Water page with Day/Week/Month/3-Months/Year/Custom navigation (Previous/Next, a "Today" shortcut, and a lightweight date-picker sheet), grouping and sorting of historical entries, summary cards (total, average, goal days, best/lowest day), a history chart with automatic (and, for custom ranges, manual) daily/weekly/monthly aggregation, a monthly calendar view, and add/edit/delete for any entry on any date.
- Hydration settings: daily goal, default serving size, metric/US units, celebration style (full/simple/off), remembered expansion.
- A typed-confirmation ("HYDRATION"), double-confirmed hydration data reset with optional CSV/JSON export first, scoped so it never touches other app data.
- Exercise video library: a per-exercise "Exercise Videos" section with separate Default Videos (curated, non-editable) and My Saved Videos (add, rename, favorite, reorder, delete).
- "Watch on YouTube" opens the installed YouTube app (falling back to the browser) for both Default and Saved videos — reliable playback outside the app, after two embedded in-app player designs each failed to play video on a real device (DECISIONS.md #42).
- "Search YouTube" pre-filled with "{Exercise Name} Proper Form," opening youtube.com's own search (zero setup, no API key) — replacing an earlier in-app API-key search that proved confusing to configure.
- "Add YouTube Link" to save a pasted URL with automatic (keyless) title/thumbnail lookup, no API key ever required.
- The Default Videos section is hidden entirely on any exercise with none seeded (instead of showing an empty state), and a Settings → Video Library toggle ("Hide default exercise videos") lets a user suppress it everywhere even when videos exist.
- A new "Yoga" exercise category (schema migration-free — it's seed content, not a schema change) with Surya Namaskar (Sun Salutation) and five other poses; a batch of additional popular strength/cardio exercises (Chin-Up, Push Press, Box Jump, Wall Sit, Pistol Squat, Jumping Jacks, High Knees, Battle Ropes, Renegade Row, Superman).

### Changed

- Workout exercises now snapshot plan targets when a session starts.
- Active workout details mount only for the focused exercise; the full list uses lightweight summary cards for large sessions.
- Shared application errors prevent raw SQLite failures from reaching UI messages.
- The focused exercise's name in an active workout is now tappable, opening that exercise's detail page; the back button/gesture returns to the same in-progress workout.

### Fixed

- Fixed a stuck-workout bug: with zero completed sets, "Finish Workout" refused to save (correctly) but its "Discard" option only ever appeared alongside a successful finish, so there was no way to leave the workout at all. Added a standalone "Cancel Workout" action, always reachable, plus a "Discard Workout" option on the "Cannot finish yet" error itself.
- Added an explicit "Cancel" button to every modal-presented screen's header (New/Edit Exercise, Add Exercises to a plan or workout, Create Group) — previously the only way to leave was an easy-to-miss swipe-down gesture on iOS, and nothing at all on Android.
- The plan detail screen now shows a History section (reusing the existing plan→workout link and history query, no schema change): times used, last-performed date, and a card per past completed workout from that plan, tapping through to its full details.
- Enforced a single active workout at the database level.
- Added persisted audit timestamps to workout sets.
- Added a completed-workout timestamp index for history queries.
- Added schema migration 5 for personal-record audit columns and a per-workout unique index.
- Added schema migration 6 for cardio, grouping, and advanced set structures.
- Added `react-native-svg` for the lightweight custom Progress charts.
- Added schema migration 8 for the `water_entries` table.
- Added `expo-haptics` for the hydration goal-celebration haptic.
- Added a light color palette (`lightColors`) and `useAppColors()` hook so new hydration UI honors the existing theme setting.
- Added schema migration 9 for water-entry provenance/notes and the `hydration_goal_history` table.
- Added schema migration 10 for `exercise_default_videos` and `exercise_saved_videos`.
