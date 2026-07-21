export const colors = {
  background: '#0B0D0F',
  surface: '#171A1E',
  surfaceElevated: '#20242A',
  border: '#30353D',
  text: '#F7F9FA',
  textMuted: '#9DA5AF',
  accent: '#35E07A',
  accentPressed: '#29B963',
  accentText: '#07140C',
  danger: '#FF6464',
  warning: '#FFBF47',
  success: '#22C55E',
  overlay: 'rgba(0, 0, 0, 0.68)',
} as const;

/**
 * Light counterpart to `colors`, matching the hex values already used for the light navigation
 * theme in ThemeContext.tsx. Most screens still import the dark `colors` directly (a pre-existing
 * gap outside this feature's scope) — new hydration components read the active palette through
 * `useAppColors()` instead so they honor the user's light/dark preference.
 */
export const lightColors = {
  background: '#F4F6F5',
  surface: '#FFFFFF',
  surfaceElevated: '#EEF1EF',
  border: '#D7DDD9',
  text: '#111713',
  textMuted: '#5B6B62',
  accent: '#168B4C',
  accentPressed: '#12723D',
  accentText: '#FFFFFF',
  danger: '#C6423B',
  warning: '#9A6A0A',
  success: '#15803D',
  overlay: 'rgba(0, 0, 0, 0.4)',
} as const;

export type AppColors = { readonly [K in keyof typeof colors]: string };
