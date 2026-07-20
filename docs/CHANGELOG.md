# Changelog

## Unreleased

### Added

- Five-tab Expo Router navigation and settings entry point.
- Versioned SQLite initialization, foreign keys, indexes, and idempotent seeds.
- Searchable/filterable built-in and custom exercise library.
- Workout plan creation, editing, ordering, duplication, archival, and starter templates.
- Active strength workouts from plans or an empty session, immediate set persistence, rest timer, finish/discard flow, and summary.
- Project architecture, database, development, feature, roadmap, testing, and decision documentation.

### Changed

- Workout exercises now snapshot plan targets when a session starts.
- Shared application errors prevent raw SQLite failures from reaching UI messages.

### Fixed

- Enforced a single active workout at the database level.
- Added persisted audit timestamps to workout sets.
