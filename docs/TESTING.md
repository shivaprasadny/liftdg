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
- [ ] Adding, removing, and reordering active-workout exercises persists.
- [ ] Rest timer pauses, resumes, extends, skips, and reasonably recovers after backgrounding.
- [ ] Finishing requires a completed set and opens the summary.
- [ ] Discard confirmation removes the active workout and children.
- [ ] No raw database error is shown to the user.

## Strategy

Pure business functions should be fast unit tests with explicit boundary cases. Repository tests should focus on parameterized queries, cascades, transactions, and built-in protections rather than UI behavior. Route behavior should be checked manually now; component integration tests can be added in Phase 8 when a React Native testing harness is introduced.
