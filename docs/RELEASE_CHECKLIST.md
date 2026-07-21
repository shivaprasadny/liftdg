# Release checklist

## Code quality
- [ ] `npm run typecheck`, lint, tests, coverage, and Doctor pass
- [ ] No debug screens, sample data, secrets, raw SQL errors, or private-data logs

## Data safety
- [ ] Upgrade migration from schema 5 and 6 tested
- [ ] Backup/merge/replace/reset tested on populated device data
- [ ] Active workout and timers recover after force-close/backgrounding
- [ ] Integrity check returns no issues

## Accessibility and performance
- [ ] VoiceOver, TalkBack, largest text, contrast, and touch targets checked
- [ ] 100-set workout, large exercise library/history, charts, startup, and backup profiled

## iOS
- [ ] Bundle ID, version/build, icon/splash, Face ID text, iPhone test confirmed
- [ ] Tablet policy confirmed (`supportsTablet` currently false)
- [ ] TestFlight archive installed and exercised

## Android
- [ ] Package/version code, adaptive icon, edge-to-edge, back behavior checked
- [ ] Preview APK and production AAB installed/tested through appropriate channels

## Store listing
- [ ] Final title, description, keywords, screenshots, category, age rating
- [ ] Privacy policy URL, support contact, and legal review completed

