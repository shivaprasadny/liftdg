# LiftDG

**Track Every Rep**

LiftDG is a local-first iOS and Android workout tracker built with Expo and React Native. It provides an exercise library, custom exercises, reusable workout plans, and resilient active-workout logging without requiring an account, backend, subscription, or network connection.

## Privacy and offline design

Primary data is stored in an on-device SQLite database. LiftDG has no backend, login, remote API, or cloud database. AsyncStorage is reserved for small UI preferences such as recoverable rest-timer state. Deleting the app normally deletes its sandbox and local data unless the operating system restores it from a device backup.

## Current features

- Five-tab Expo Router navigation
- 116 versioned built-in exercises plus custom exercise creation/editing/archiving
- Exercise search and category/equipment/type filters
- Eight immutable starter plans plus custom plan creation, editing, ordering, duplication, archiving, and deletion
- Active strength workouts started from plans or empty
- Immediate SQLite persistence for sets and exercise changes
- Rest timer, workout completion, discard, and basic summary

History browsing, progress statistics, personal records, cardio, settings, backup/restore, and CSV export are planned. See [FEATURES.md](docs/FEATURES.md) and [ROADMAP.md](docs/ROADMAP.md).

## Technology stack

- Expo SDK 54, React Native 0.81, React 19, TypeScript
- Expo Router
- `expo-sqlite`
- React Hook Form and Zod
- date-fns
- AsyncStorage for lightweight preferences only
- Vitest, Expo ESLint, and Expo Doctor

## Installation

Requires Node.js 20.19 or newer, npm, and Expo Go or a native simulator toolchain.

```bash
npm install
npx expo start
```

The project `npm start` command explicitly starts Expo Go mode:

```bash
npm start
```

## Run on iOS

```bash
npm run ios
```

This starts Metro and requests an iOS target. A simulator requires macOS and Xcode. A physical device can scan the Expo Go QR code when it can reach the development machine.

## Run on Android

```bash
npm run android
```

Use an Android emulator or scan the Metro QR code with Expo Go on a reachable physical device.

## Development commands

```bash
npx expo start
npm run ios
npm run android
npm test
npm run lint
npx tsc --noEmit
npx expo-doctor
```

## Project structure

```text
src/app/           Expo Router screens
src/components/    Reusable visual components
src/contexts/      Database and plan-draft coordination
src/hooks/         Reusable stateful behavior
src/services/      Business rules and calculations
src/repositories/  Parameterized SQLite access and row mapping
src/database/      Initialization, migrations, and seeds
src/data/          Stable built-in JSON data
src/types/         Domain models
src/constants/     Theme and domain constants
src/utils/         Validation, IDs, errors, and conversions
docs/              Architecture and contributor documentation
```

## Database

The database is named `liftdg.db` and is created inside the application sandbox by `SQLiteProvider`. Initialization enables foreign keys and WAL mode, applies ordered migrations, and then runs versioned exercise and starter-plan seeds. SQLite persists across app restarts. See [DATABASE.md](docs/DATABASE.md).

## Contribution workflow

Create a focused branch from the shared development branch, for example `feature/active-workout`. Keep commits small and use imperative subjects such as `Add workout set persistence`. Run tests, TypeScript, lint, and Expo Doctor before requesting review. Never rewrite a migration that may have run on a device; add a new migration instead.

## Roadmap

The project is complete through Active Workout Logging. The next phase is Workout History, followed by progress/personal records, cardio, settings/data portability, and release preparation. Full definitions of done are in [ROADMAP.md](docs/ROADMAP.md).

## Additional documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Features](docs/FEATURES.md)
- [Development](docs/DEVELOPMENT.md)
- [Testing](docs/TESTING.md)
- [Decisions](docs/DECISIONS.md)
- [Changelog](docs/CHANGELOG.md)
