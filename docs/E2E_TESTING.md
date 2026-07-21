# End-to-end testing

No heavy E2E dependency is committed yet. Maestro is the preferred first option because it can drive native preview builds with minimal app instrumentation. Add flows only after stable accessibility identifiers are agreed.

Critical flows:

1. Create a plan, start it, complete sets, finish, verify History and Progress.
2. Create a superset/drop set, finish, and confirm summary totals do not double count.
3. Save cardio duration/distance, verify pace, History, and Progress.
4. Create data, export JSON, reset, restore with replace, and verify relationships/totals.
5. Repeat merge restore and confirm stable IDs prevent duplicates.
6. Force-close during an active workout and confirm the Start tab offers resume.

Run these manually on iOS and Android preview builds before automating. Never point database tests at a user database; E2E builds should use disposable simulator/emulator app sandboxes.

