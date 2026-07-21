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
- [ ] Rest timer pauses, resumes, extends, skips, and reasonably recovers after backgrounding.
- [ ] Finishing requires a completed set and opens the summary.
- [ ] Discard confirmation removes the active workout and children.
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

## Strategy

Pure business functions should be fast unit tests with explicit boundary cases. Active-navigation tests cover boundaries, positions, direct selection, reorder/deletion recovery, group order, circuit rounds, completion, and unified cardio/timed/advanced-set behavior. History tests cover local date grouping, relational-search matching, pagination, sorting, repeat snapshots, target derivation, timing recalculation, deletion guards, and previous-performance mapping. Phase 6 tests cover pace/speed and units, cardio validation/type derivation, group conversion/order/rounds, plan-group copying, advanced-stage totals/record values, AMRAP/timed rules, bodyweight/assisted display, and double-count prevention. Phase 5 tests cover set volume and Epley one-rep-max boundaries, percent-change/comparison hiding, date-range and previous-period boundaries, daily/longest streak and weekly-average calculation, chart-grouping bucket math, exercise-progress aggregation and bodyweight detection, personal-record candidate detection, duplicate-record prevention, record recalculation, and backfill idempotency. Repository tests should focus on parameterized queries, cascades, transactions, and built-in protections. Native focus, keyboard, timer, and accessibility behavior remains on the device checklist until a React Native component harness is added.
