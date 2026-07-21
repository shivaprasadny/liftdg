import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { type PropsWithChildren, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { colors } from '@/constants/colors';
import { useSettings } from './SettingsContext';

export function AppThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme(); const { settings } = useSettings();
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && system !== 'light');
  const theme = useMemo(() => dark ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.background, card: colors.surface, border: colors.border, primary: colors.accent, text: colors.text } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: '#168B4C', background: '#F4F6F5', card: '#FFFFFF', border: '#D7DDD9', text: '#111713' } }, [dark]);
  return <NavigationThemeProvider value={theme}>{children}</NavigationThemeProvider>;
}

