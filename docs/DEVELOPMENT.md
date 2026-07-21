# Development

## Requirements and setup

Expo SDK 54 requires Node.js 20.19 or newer. Use a current npm release and the current Expo Go application. No environment variables, backend credentials, or network services are required after dependencies are installed.

```bash
npm install
npx expo start
```

Use `npm run ios` for an installed iOS Simulator and `npm run android` for a running Android emulator or connected device. Physical devices and the development computer must normally be reachable on the same network.

Quality commands:

```bash
npx tsc --noEmit
npm run lint
npm test
npx expo-doctor
```

## Workflow

Create focused branches such as `feature/exercise-library`, `feature/workout-plans`, `feature/active-workout`, `feature/workout-history`, `feature/progress-statistics`, `feature/cardio`, and `feature/backup-settings`. Prefer imperative, scoped commits such as `feat(workout): persist completed sets`. Keep unrelated changes out of feature commits and merge only after checks pass.

## Code conventions

- Use PascalCase for components/types, camelCase for functions, and kebab-free route names compatible with Expo Router.
- Keep strict TypeScript enabled. Avoid `any`; narrow `unknown` values at boundaries.
- Route files render, navigate, and call hooks/repositories/services. They do not contain SQL.
- Components are reusable visual units and contain no SQL or cross-aggregate business rules.
- Repositories own parameterized SQL, row mapping, CRUD, and database-specific error boundaries.
- Services own calculations and business rules; multi-repository workflows belong there when introduced.
- Multi-table writes must use transactions. Translate infrastructure failures to `AppError` before showing messages.
- Prefer hooks/Context for focused reusable state. SQLite remains the source of truth.

## Database and seed rules

Never modify an already-released migration. Increase `DATABASE_VERSION`, add the next migration, and keep upgrades compatible with existing device data. Enable and respect foreign keys, add indexes for common lookups, and test both fresh installation and upgrade paths.

Built-in seed records require stable IDs. Increment the applicable seed version when shipping additions or deliberate template updates. Seeds must be idempotent, must not duplicate records, and must preserve user-owned content. Built-in exercises and plans remain protected so future seeds can refresh them safely.

Backup format changes are independent of database migrations. Increment `BACKUP_FORMAT_VERSION`, add explicit validation or migration behavior, and retain compatibility tests. CSV is reporting-only. Verify biometric, document-picker, and share-sheet changes in a native development/release build because Expo Go does not provide every platform authentication behavior.

## UI rules

Use shared colors, spacing, typography, buttons, inputs, cards, loading states, and empty states. Keep touch targets large, add accessibility roles/labels where meaning is not obvious, and never communicate completion only through color.
