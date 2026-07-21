import { useColorScheme } from 'react-native';

import { useSettings } from '@/contexts/SettingsContext';
import { colors, lightColors, type AppColors } from '@/constants/colors';

/** Resolves the active palette from the theme setting, matching AppThemeProvider's dark/light rule. */
export function useAppColors(): AppColors {
  const system = useColorScheme();
  const { settings } = useSettings();
  const dark = settings.theme === 'dark' || (settings.theme === 'system' && system !== 'light');
  return dark ? colors : lightColors;
}
