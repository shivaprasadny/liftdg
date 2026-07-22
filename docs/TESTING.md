# Testing

## Automated checks

Run these before merging:

```bash
npx tsc --noEmit
npm run lint
npm test
npx expo-doctor
```

Vitest covers pure validation, ordering, snapshot, and calculation rules. Repository tests should use an isolated SQLite database and verify both returned models and stored rows. Migration tests should cover a fresh database and each supported prior schema, confirm `user_version`, foreign keys, indexes, and idempotent seeds.

Current measured V8 coverage is **17.24% statements overall**, **77.24% for services**, **62.82% for utilities**, and **12.37% for repositories**. Routes and native components are currently uninstrumented, and repository integration coverage is below the release target. Run `npm run test:coverage`; do not present these numbers as meeting the target.

## Manual checklist

- [ ] App launches in current Expo Go on iOS and Android.
- [ ] Database initializes without a raw SQLite message.
- [ ] Built-in exercises seed once and do not duplicate after restart.
- [ ] A custom exercise persists after restart and can be edited/archived.
- [ ] Exercise search, category filters, and equipment filters work.
- [ ] A workout plan saves and persists after restart.
- [ ] A starter plan duplicates into a new user-owned plan.
- [ ] A built-in plan cannot be directly modified or deleted.
- [ ] Starting from a plan copies targets and creates initial sets.
- [ ] A plan with no completed workouts shows no History section; after completing a workout from that plan, the plan's detail screen shows it under History with correct "Used N times · Last [date]" text, and tapping the card opens that workout's full details.
- [ ] Only one active workout can exist.
- [ ] Weight, reps, type, RPE, notes, and completion persist after navigation/restart.
- [ ] All workout exercises appear in one ordered summary list and focus by tapping a card.
- [ ] Previous/Next boundaries, position indicator, and jump picker match saved workout order.
- [ ] Pending set inputs flush before focus changes; a failed save retains the focused editor and shows a safe retry message.
- [ ] Superset and giant-set members navigate in member order; circuit navigation loops rounds before leaving the group.
- [ ] Drop/rest-pause stages are not counted as exercises; cardio and timed exercises are counted.
- [ ] Rest/cardio/timed timer state continues while focus changes and after resume.
- [ ] Auto-advance shows a three-second warning, can be cancelled, and never finishes a workout.
- [ ] Adding, removing, and reordering active-workout exercises persists.
- [ ] Tapping the focused exercise's name opens that exercise's detail page (description, muscle groups, video library); the back button/gesture returns to the same in-progress workout with all entered set values intact.
- [ ] Rest timer pauses, resumes, extends, skips, and reasonably recovers after backgrounding.
- [ ] Finishing requires a completed set and opens the summary.
- [ ] Discard confirmation removes the active workout and children.
- [ ] "Cancel Workout" (in the active-workout header, both list and focused views) is reachable and discards the workout even with zero completed sets, where "Finish Workout" correctly refuses to save but still offers "Discard Workout" from its own error alert.
- [ ] Every modal-presented screen (New/Edit Exercise, Add Exercises, Create Group) shows an explicit "Cancel" button in its header and returns to the previous screen without saving anything.
- [ ] Three completed workouts on different dates appear in the correct local-date groups.
- [ ] Search matches workout names, exercise names, plans, and workout notes after its debounce.
- [ ] Date/type/plan/exercise/duration/notes filters and all sort choices reset pagination.
- [ ] Details show completed-only totals while clearly retaining incomplete sets.
- [ ] Repeat copies structure and suggestions as a new incomplete active workout.
- [ ] Duplicate as Plan derives completed set counts and min/max repetitions.
- [ ] Editing timing, exercises, sets, order, and notes keeps the workout completed.
- [ ] Confirmed deletion cascades to workout exercises and sets and refreshes History.
- [ ] Active workouts show the latest earlier completed performance for each exercise.
- [ ] A standalone cardio session persists with valid kilometer/mile display and pace.
- [ ] The cardio timer recovers after backgrounding and excludes paused time.
- [ ] A mixed workout retains strength work and its cardio finisher.
- [ ] Superset, giant-set, and circuit membership survives restart and plan copying.
- [ ] Drop/rest-pause stages aggregate without a counted placeholder.
- [ ] Timed, AMRAP, bodyweight, and assisted sets persist and render clearly.
- [ ] Added weight is the only bodyweight load included in lifting volume.
- [ ] Cardio records reject invalid pace and distances below the threshold.
- [ ] Unit changes update display without rewriting canonical kg/km values.
- [ ] JSON backup shares successfully and validates before restore.
- [ ] Merge and replace restore preserve relationships and avoid duplicate IDs.
- [ ] Invalid/future backup formats are rejected without changing data.
- [ ] CSV exports preserve Unicode and escape commas, quotes, and newlines.
- [ ] Full reset requires `RESET`, clears app lock, and restores visible built-ins.
- [ ] Native builds handle biometric absence, failure, fallback, and background locking.
- [ ] No raw database error is shown to the user.
- [ ] Progress tab loads and all eight sections render.
- [ ] Date filters (week/month/30d/3m/6m/year/all/custom) each load without error.
- [ ] Training-overview totals (workouts, sets, reps, volume, duration) match manually counted workout history.
- [ ] Volume totals exclude incomplete sets.
- [ ] Training-duration totals are correct.
- [ ] Current streak is correct for consecutive-day training.
- [ ] Longest streak is correct and unaffected by the selected date filter.
- [ ] The exercise selector search, recently-trained, and most-trained sections all work.
- [ ] Exercise-progress chart points are in chronological order.
- [ ] Max weight and estimated one-rep max shown for an exercise match its logged history.
- [ ] A new personal record appears in Progress, on the workout summary, and on workout details immediately after finishing a qualifying workout.
- [ ] A lower-than-best performance does not create a false personal record.
- [ ] Editing a completed workout's sets updates its personal records (added, changed, and removed).
- [ ] Deleting a completed workout recalculates its exercises' records from the remaining history.
- [ ] Bodyweight exercises hide weight-based metrics and still show reps/sets.
- [ ] Restarting the app preserves all previously computed personal records.
- [ ] Onboarding accepts a required name and optional birth date, height, and weight.
- [ ] Profile edits and weight history persist after restart; unit switches do not rewrite kg/cm rows.
- [ ] Two measurement sessions produce correct latest/previous and custom-date differences.
- [ ] Hidden measurement types retain and redisplay historical values when re-enabled.
- [ ] Weight and measurement charts remain separate from lifting-volume charts.
- [ ] Backup format 2 restores profile and body relationships; format 1 restores with empty body collections.
- [ ] Profile, weight, and body-measurement CSV files escape user notes correctly.
- [ ] Full reset deletes profile/body data and returns to onboarding.
- [ ] Adding and undoing (removing the last serving) water updates the Home card and full Water screen immediately.
- [ ] The quick-add long-press sheet adds each preset amount and a valid custom amount; it never accepts zero/negative amounts.
- [ ] The progress bar changes color and the milestone message updates as intake crosses each threshold (0/25/50/75/90/100%+).
- [ ] Reaching the goal celebrates once; re-opening the app or re-reaching the goal the same day does not replay it; dropping below goal and hitting it again the same day still does not replay it.
- [ ] The arrow opens the analytics carousel in one tap; swiping left/right moves between Week/Month/3-Months/Year and the pagination dots update and animate to match.
- [ ] Tapping a pagination dot jumps directly to that page.
- [ ] "Remember expanded card" restores the last open/closed state and carousel page after an app restart; disabling it always starts collapsed.
- [ ] Week/month/quarter/year totals, percentages, and goal-day counts match manually computed values, including a leap-year February.
- [ ] The Home glass count shows the current default serving size (e.g. "300 ml each").
- [ ] Changing the water unit (metric/US) updates displayed values only, never the stored entries.
- [ ] Custom daily goal and custom serving size accept ml/L/fl-oz input, reject invalid/negative/out-of-range values, and warn (with a cancel option) on unusually low/high values or a serving at/above the daily goal.
- [ ] Changing the daily goal offers "Starting Today," "Starting Tomorrow," and "Apply to All History" (with its own extra confirmation), and each produces correctly graded historical days afterward.
- [ ] The full Water page's Day/Week/Month/3-Months/Year/Custom selector, Previous/Next navigation, "Today" button, and date-picker sheet all reach the expected period; Next is disabled once the next period would start after today.
- [ ] Historical summary cards (total, average, goal days, best day, lowest day, goal completion, streaks, best month where applicable) match manually computed values for a past period.
- [ ] The history chart aggregates daily/weekly/monthly correctly per period, and Custom range respects both automatic and manually overridden aggregation.
- [ ] The monthly calendar view shows the correct state (none/below half/50–99%/goal met/above goal) per day via icon and percentage, not color alone, and tapping a day opens that day's entries.
- [ ] Group By (entries/day/week/month/quarter/year) and Sort By (newest/oldest/highest/lowest/best completion/lowest completion) both change the entry list as expected and don't get confused with each other.
- [ ] Adding, editing, and deleting an entry for a past date all require an explicit date/time and update the correct period's statistics.
- [ ] Reset Hydration Data: the delete button stays disabled until exactly `HYDRATION` is typed (rejecting lowercase, mixed case, and internal extra spaces); a second alert confirms before deletion; optional CSV/JSON export works; only hydration data is removed, and "also reset hydration settings" only resets settings when explicitly checked.
- [ ] The Home card and full Water screen render correctly in both light and dark theme.
- [ ] VoiceOver announces the current total, goal, remaining amount, and percentage on the card, each quick button announces its serving amount, and the reset screen announces the disabled/enabled delete-button state.
- [ ] Water tracking works fully offline and survives an app restart with no data loss, including goal history and entry provenance.
- [ ] The Exercise Videos section shows Default Videos and My Saved Videos as separate lists on the exercise detail screen; an exercise with zero default videos hides the "Default Videos" heading/list entirely instead of showing an empty state.
- [ ] Settings → Video Library → "Hide default exercise videos" hides the Default Videos section on every exercise (even ones with videos) when on, and restores it when off.
- [ ] "Watch on YouTube" opens the installed YouTube app if present, otherwise the browser, for both Default and Saved videos.
- [ ] "Search YouTube" opens the browser (or installed YouTube app) directly to a search pre-filled with "{Exercise Name} Proper Form," with no in-app screen, key, or setup step required.
- [ ] Add YouTube Link rejects a non-YouTube URL, accepts a valid one, looks up and previews the real title/thumbnail via oEmbed, and saves successfully even when the oEmbed lookup fails.
- [ ] Saved videos can be renamed, marked/unmarked favorite (only one favorite per exercise, and the favorite always sorts first), reordered with the up/down controls, and removed; Default Videos offer none of these controls.
- [ ] Default videos are never editable or deletable through the UI.
- [ ] Restarting the app preserves saved videos, their order, favorite, and renamed titles.

## Strategy

Pure business functions should be fast unit tests with explicit boundary cases. Active-navigation tests cover boundaries, positions, direct selection, reorder/deletion recovery, group order, circuit rounds, completion, and unified cardio/timed/advanced-set behavior. History tests cover local date grouping, relational-search matching, pagination, sorting, repeat snapshots, target derivation, timing recalculation, deletion guards, and previous-performance mapping. Phase 6 tests cover pace/speed and units, cardio validation/type derivation, group conversion/order/rounds, plan-group copying, advanced-stage totals/record values, AMRAP/timed rules, bodyweight/assisted display, and double-count prevention. Phase 5 tests cover set volume and Epley one-rep-max boundaries, percent-change/comparison hiding, date-range and previous-period boundaries, daily/longest streak and weekly-average calculation, chart-grouping bucket math, exercise-progress aggregation and bodyweight detection, personal-record candidate detection, duplicate-record prevention, record recalculation, and backfill idempotency. Repository tests should focus on parameterized queries, cascades, transactions, and built-in protections. Phase 10 tests cover unit conversion (ml/L/US fl oz) and serving-amount formatting, glass-count rounding, day/week/month/quarter/year rollup math (including a leap-year and a non-leap-year February), goal-day counting, goal-met streaks, milestone-message thresholds, remaining/over-goal text, encouraging-message non-repetition, goal-history resolution and change planning (first-change backfill, today/tomorrow/all-history modes), historical period bounds and Previous/Next navigation boundaries (including the "no next period beyond today" rule and custom ranges never stepping), chart-aggregation thresholds and bucket math, hydration-calendar day-state classification, entry grouping/sorting (including completion-based day ranking), and the reset-confirmation exact-match guard. Phase 11 tests cover YouTube URL/video-ID extraction and validation across watch/shortened/Shorts/embed/mobile URL forms, the single-favorite-per-exercise clear-then-set logic (including toggle-off when re-tapping the current favorite), saved-video reorder persistence, and duplicate-save rejection. Native focus, keyboard, timer, and accessibility behavior remains on the device checklist until a React Native component harness is added.
