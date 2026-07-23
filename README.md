# LiftDG

**Track Every Rep**

LiftDG is a local-first iOS and Android workout tracker built with Expo and React Native. It provides an exercise library, custom exercises, reusable workout plans, and resilient active-workout logging without requiring an account, backend, subscription, or network connection.

## Privacy and offline design

Primary data is stored in an on-device SQLite database. LiftDG has no backend, login, remote API, or cloud database. AsyncStorage is reserved for small UI preferences such as recoverable rest-timer state. Deleting the app normally deletes its sandbox and local data unless the operating system restores it from a device backup.

## Current features

- Five-tab Expo Router navigation
- 132 versioned built-in exercises (including a Yoga category) plus custom exercise creation/editing/archiving
- Exercise search and category/equipment/type filters
- Eight immutable starter plans plus custom plan creation, editing, ordering, duplication, archiving, and deletion
- Active strength workouts started from plans or empty
- Immediate SQLite persistence for sets and exercise changes
- Unified active-workout exercise list with focused logging, jump picker, previous/next controls, grouped circuit order, and optional guarded auto-advance
- Active-session exercise replacement with ranked alternatives, explanations, equipment awareness, optional reasons, and safe unfinished-set transfer
- Paginated workout History with remembered list, calendar, and timeline views, PR/quality badges, planned-versus-performed review, repeat-as-new, and audited metadata corrections
- Premium Training month planner with a full week grid, month/year picker, visible workout chips, selected-day agenda, and date-prefilled scheduling
- Rest timer, workout completion, discard, and basic summary
- Paginated workout history with local-date grouping, debounced search, filters, and sorting
- Completed-workout details, editing, repeat, duplicate-as-plan, deletion, and previous performance
- Progress statistics and local personal-record detection
- Standalone cardio logging with live timer recovery, pace/speed calculations, and cardio progress summaries
- Mixed-workout cardio finishers and persisted superset, giant-set, and circuit groups
- Advanced set storage and entry for timed, AMRAP, assisted, bodyweight, drop, and rest-pause work
- Typed local settings, unit preferences, appearance controls, and biometric app lock
- Versioned JSON backup with merge/replace restore and pre-restore safety snapshots
- Five CSV reports plus data summary, selective deletion, and protected reset
- Local profile, body-weight history, configurable body measurements, comparisons, and weight/measurement charts
- Home hydration card with quick add/undo, a swipeable week/month/3-months/year analytics carousel, milestone messages, once-daily goal celebration, custom goal/serving entry with goal history, and a full Water page for historical navigation, charts, calendar, and per-entry editing
- Exercise video library: curated Default Videos plus personal Saved Videos (add, rename, favorite, reorder, delete), "Watch on YouTube" (installed app or browser), a "Search YouTube" hand-off to youtube.com (zero setup), and "Add YouTube Link" by URL

Advanced multi-stage editing still needs polish. Active-workout navigation keeps every strength, cardio, timed, bodyweight, assisted, and grouped exercise in saved workout order; drop/rest-pause stages remain inside their exercise. Phase 7 data portability is implemented; physical-device biometric and share-sheet verification remains release work. See [FEATURES.md](docs/FEATURES.md) and [ROADMAP.md](docs/ROADMAP.md).

## Technology stack

- Expo SDK 54, React Native 0.81, React 19, TypeScript
- Expo Router
- `expo-sqlite`
- React Hook Form and Zod
- date-fns
- `react-native-svg` (Progress charts)
- `expo-haptics` (hydration goal celebration)
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
npm run typecheck
npm run test:watch
npm run test:coverage
npm run doctor
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

The database is named `liftdg.db` and is created inside the application sandbox by `SQLiteProvider`. Initialization enables foreign keys and WAL mode, applies ordered migrations, and then runs versioned exercise and starter-plan seeds. Profile, weight, and measurement values use the same local database and remain protected by the existing app lock. SQLite persists across app restarts. See [DATABASE.md](docs/DATABASE.md).

## Contribution workflow

Create a focused branch from the shared development branch, for example `feature/active-workout`. Keep commits small and use imperative subjects such as `Add workout set persistence`. Run tests, TypeScript, lint, and Expo Doctor before requesting review. Never rewrite a migration that may have run on a device; add a new migration instead.

## Roadmap

Phase 8 release foundations are in progress: onboarding, CI/EAS configuration, coverage, integrity diagnostics, and release drafts are present. Device testing, final branded assets, and performance profiling remain. Full definitions of done are in [ROADMAP.md](docs/ROADMAP.md).

EAS profiles live in `eas.json`. After project ownership and signing are configured, run `eas build --profile preview --platform android|ios` for internal testing and the `production` profile for store artifacts. CI never submits builds.

## Additional documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Features](docs/FEATURES.md)
- [Development](docs/DEVELOPMENT.md)
- [Testing](docs/TESTING.md)
- [Decisions](docs/DECISIONS.md)
- [Changelog](docs/CHANGELOG.md)
