# Changelog

## Unreleased

### Added

- A clear calendar-based program start-date picker with direct month/year navigation, selected start and planned finish summaries, and per-run program schedule cancellation that preserves completed and in-progress workouts.
- Cancelled program occurrences are now hidden from the month planner, and program-linked calendar workout details include a direct “Cancel Remaining Program Workouts” action.
- Program cancellation is now strictly forward-looking: it cancels only today/future eligible occurrences and never changes past calendar entries, completed workouts, history, or statistics.
- Training now opens on Calendar by default and uses dedicated Calendar, My Workouts, Starter Plans, and Programs navigation. The Calendar’s green add button offers scheduling an existing workout or creating a new one.
- Programs now has a green create button and a custom-program builder for program details, 1–52 weeks, 1–7 weekly training days, and a linked workout for each day. New workouts and their exercises continue to use the existing workout builder.
- The custom-program builder now edits each week independently instead of repeating one schedule across every week: a week selector lets you assign a different workout to each day of each week, with a "Copy Previous Week" action to reuse the prior week as a starting point (confirms before overwriting a week that already has choices) — see DECISIONS.md #51.
- Each week in the custom-program builder can now have its own number of training days (not just different workouts) — Step 2's day-count picker only sets the default for new weeks, and a +/− stepper next to the week selector in Step 3 adds or removes training days for the week currently being edited (confirms before removing a day that already has a workout chosen) — see DECISIONS.md #54.
- User-created programs can now be edited and deleted: Program Details shows "Edit Program" and "Delete Program" for any non-built-in program, reusing the same per-week builder (pre-filled with the program's current weeks/days/workouts) to save changes. Built-in programs (Shiva's Favorites, the ten Popular Programs) remain fully protected — see DECISIONS.md #55.
- A day in the custom-program builder can now hold more than one workout — a "+ Add Another Workout to This Day" action lets you add, say, a Morning and an Evening session to the same day, each with its own free-text label and its own workout.
- The workout picker inside the program builder now lets you preview a workout's exercises (tap the chevron/"What's inside this workout?" to expand a live list of exercises and set/rep targets) before or after choosing it, and has a "+ Create New Workout" action tied to the specific day/slot you're filling — creating a workout and returning to the builder now auto-fills it into that same slot instead of leaving you to search for it — see DECISIONS.md #56.
- A previewed workout can now be duplicated straight into a program day via "Duplicate & Customize This Workout" — makes a personal copy, opens the full exercise/sets/reps editor on that copy, and auto-fills the copy into the day/slot you were filling when you return, so you can change exercises, sets, and reps for one specific program day without touching the original workout anywhere else it's used — see DECISIONS.md #57.
- Fixed the custom-program builder defaulting "Number of weeks" to 4 while only showing a "Week 1" chip until the field was manually touched — the week list now initializes to match the displayed default.
- Fixed the custom-program builder (both Create and Edit) hiding its bottom input/submit button behind the keyboard on iOS — wrapped in `KeyboardAvoidingView`, matching the Active Workout screen fix above.

- Ten popular built-in programs (StrongLifts 5x5, Starting Strength, Full Body Beginner, Upper/Lower Split, Push Pull Legs, Wendler 5/3/1, GZCLP, PHUL, PHAT, Arnold Split), spanning beginner to advanced and 3-12 week/day structures, shown in a new "Popular Programs" section on the Programs screen alongside Shiva's Favorites — see DECISIONS.md #50.

- Modern Training Calendar month planner with direct month/year navigation, compact workout events, day selection, premium agenda cards, theme-aware styling, and selected-date scheduling.

- Phase 12 Apply Changes foundation: on a completed workout's details screen, an "Apply Changes" action appears when an exercise was fully replaced during the session and its original still has a slot in the (non-built-in) linked workout template. Review each swap individually and choose "Update Workout Template" or "No Future Changes" — see DECISIONS.md #48 for what's deferred (weight/rep/RPE proposals, program-week scopes, conflict resolution, audit trail, revert).

- Phase 11 History foundation: remembered list/calendar/timeline views, completion-quality and PR badges, planned-versus-performed review, correction overlays/audits, and deletion snapshots.

- Phase 10 replacement foundation: deterministic equipment-aware recommendations, curated relations, restrictions/preferences schema, audit trail, and transactional active-workout replacement UI.

- Finish Workout review, typed validation issues, completion metrics and quality, atomic completion auditing, duplicate-submit protection, and crash-after-commit summary recovery.

- Bar and plate calculator with deterministic pair-aware loading, built-in profiles, active-set metadata, visual loading order, and percentage warm-up strategies.

- Active strength pause/resume lifecycle, skipped-exercise state, session-added metadata, back-off/custom set types, richer rest-timer controls, and atomic scheduled-workout completion.

- Focused Start Workout landing screen with today ordering, resume recovery, launch previews, quick starts, and recent-workout access.
- Versioned immutable session snapshots and idempotent scheduled-workout launch metadata.
- Start-early choices that move an occurrence to today or start an independent extra copy.

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

- Cardio uses a touch-friendly combined date/time picker: monthly calendar, 12-hour clock, five-minute choices, AM/PM selection, and a readable session-date summary instead of raw date and 24-hour text fields.
- Cardio duration now uses separate Hours and Minutes fields with example placeholders; timer results are split automatically and still persist as exact seconds.
- Quick Run and Quick Ride now open the cardio-specific timer and metrics form (duration, distance, pace inputs, heart rate, calories, elevation, and cadence). Removed the ambiguous Blank quick action.
- Removed the global Plate Calculator button from Start Workout and the per-set calculator button from Active Workout. Bar and plate assumptions vary by exercise and equipment, so these shortcuts were misleading.
- Workout exercises now snapshot plan targets when a session starts.
- Active workout details mount only for the focused exercise; the full list uses lightweight summary cards for large sessions.
- Shared application errors prevent raw SQLite failures from reaching UI messages.
- The focused exercise's name in an active workout is now tappable, opening that exercise's detail page; the back button/gesture returns to the same in-progress workout.
- Renamed the "Plans" tab to "Training" (UI label only — see DECISIONS.md #43 for why the underlying Plan data model, routes, and CRUD screens intentionally did not change).
- Added `workout_type` to plans (migration 11): every plan can now be tagged Strength/Running/Cycling/Swimming/Walking/Yoga/Mobility/HIIT/Hybrid/Other, shown as a badge on the plan card and detail screen, selectable via a new picker in the create/edit form. All existing plans default to Strength. This is groundwork only — the exercise editor and plan_exercises structure are unchanged; see DECISIONS.md #44.
- Added a read-only Programs layer (migration 12): `program_templates`/`program_weeks`/`program_days`, where each day links to an existing plan. One built-in program shipped — "Shiva's Strength & Athletic" (8 weeks, 4 days/week: Push and Core, Pull and Conditioning, Legs and Athletic Strength, Full Body) — viewable from a new "Programs" button on the Training tab. No create/edit/duplicate/favorite/start/pause/resume yet; see DECISIONS.md #45.
- Added a Calendar Agenda (migration 13): schedule an existing plan onto a specific date (with an optional daypart and notes) via a new "Calendar" button on the Training tab, and see everything upcoming in a chronological, day-grouped list. One-time scheduling only — no Month/Week views, program population, drag-and-drop, conflict detection, or notifications yet; see DECISIONS.md #46.
- Tapping an exercise in a plan's detail screen or its editor now opens that exercise's own detail page (description, muscle groups, video library), matching the exercise-name tap-through already added for the active workout screen.
- Added "Start Program" (migration 14): populates the Calendar with one scheduled item per program workout day, from a chosen start date (with a computed end-date preview beforehand). Program-linked Agenda items show a "Program · Week N" label; editing or removing one works exactly like any other scheduled item — see DECISIONS.md #47 for why there's no recurring-scope picker yet.

### Fixed

- New/Edit Measurements now uses a calendar date picker that prevents future dates. Editing or duplicating an asynchronously loaded entry now correctly restores its saved date, body weight, and notes as well as its measurement values.
- Active workout set inputs now autosave while typing, accept both decimal dots and commas, display save status, and use an explicit “Complete Set” control so entered values are not confused with completed work during Finish Workout validation.
- Fixed the Active Workout screen's focused-exercise view having no `KeyboardAvoidingView`: tapping into a set's weight/reps field brought up the keyboard, which simply overlaid the fixed "Previous Exercise / Next Exercise" footer and the input itself instead of pushing the layout up, on iOS in particular. Wrapped the screen in `KeyboardAvoidingView` (`behavior="padding"` on iOS, `"height"` on Android), matching the pattern already used by the app's other keyboard-heavy modals.
- Fixed "Start Something Else" on the Start Workout tab appearing to do nothing when tapped from the "No workout planned for today" empty state: it correctly opened the workout library, but the list rendered several sections further down the page with no scroll, so the tap produced no visible feedback near the button. It now scrolls to the library section as it opens.
- Phase 13 header-consistency fix: nine screens (`body/index`, `body/weight`, `body/preferences`, `body/measurements/index`, `body/measurements/create`, `body/measurements/compare`, `settings/profile`, `settings/hydration-reset`, `water/index`) were missing from `_layout.tsx`'s route registrations, so each showed a double header — React Navigation's default header with an auto-generated title (e.g. "Index," "Weight") stacked above the screen's own correctly-titled `Header` component. All nine now have explicit `Stack.Screen` entries with proper titles, and their redundant internal headers were removed; see DECISIONS.md #49.
- Fixed a stuck-workout bug: with zero completed sets, "Finish Workout" refused to save (correctly) but its "Discard" option only ever appeared alongside a successful finish, so there was no way to leave the workout at all. Added a standalone "Cancel Workout" action, always reachable, plus a "Discard Workout" option on the "Cannot finish yet" error itself.
- Added an explicit "Cancel" button to every modal-presented screen's header (New/Edit Exercise, Add Exercises to a plan or workout, Create Group), plus the Cardio Session screen — previously the only way to leave was an easy-to-miss swipe-down gesture on iOS, and nothing at all on Android.
- The plan detail screen now shows a History section (reusing the existing plan→workout link and history query, no schema change): times used, last-performed date, and a card per past completed workout from that plan, tapping through to its full details.
- Fixed a "Text strings must be rendered within a &lt;Text&gt; component" crash on the Cardio Session screen: a stray literal space between two JSX expressions in `CardioTimer` was rendered as a raw text node. The crash left the screen in a broken state, which also explains why its header back button appeared unresponsive.
- Fixed the History tab rendering its header flush against the top of the screen (under the status bar/notch) — unlike every other tab, it wasn't wrapped in a top-safe-area container.
- "Finish Timer" on the Cardio Session screen now confirms first: "Save" (use the elapsed time, same as before), "Pause for Later" (keep the session recoverable), "Discard" (double-confirmed — wipes the timer and its elapsed time entirely), or "Keep Going" (dismiss and keep running) — previously it finished and cleared the timer immediately on tap, with no way to back out of an accidental press or to fully abandon a timer you didn't want.
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
