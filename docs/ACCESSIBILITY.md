# Accessibility

LiftDG targets VoiceOver and TalkBack compatibility, scalable text, approximately 44-point controls, high-contrast dark UI, and status communication that does not rely on color alone.

Implemented foundations include labeled tabs and icon actions, selected/disabled/checked states, spoken timer state, textual completed-set labels, chart summaries, accessible empty/error states, and larger filter/reorder controls. Reduced-motion behavior is naturally limited because the app currently has no decorative animation.

## Release checks

- VoiceOver: traverse onboarding, tabs, exercise search, plan creation, active sets, timer, history, backup, and app lock. Confirm focus order and state announcements.
- TalkBack: repeat the same paths and verify Android back behavior.
- Dynamic text: test the largest accessibility size; verify names, settings, statistics, errors, and buttons wrap without clipping.
- Contrast: verify accent, warning, error, disabled, and chart colors in light and dark appearance.
- Touch: verify every icon-only, reorder, checkbox, filter, timer, and destructive action is reachable.

Known limitations: legacy screens still contain fixed dark colors; active workout and plan forms need a large-text device pass; charts expose summaries and points but require screen-reader usability validation.

