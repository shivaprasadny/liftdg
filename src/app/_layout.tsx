import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { DatabaseContextProvider } from '@/contexts/DatabaseContext';
import { colors } from '@/constants/colors';
import { initializeDatabase } from '@/database/database';
import { DATABASE_NAME } from '@/database/schema';

const liftTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.background, card: colors.background,
    border: colors.border, primary: colors.accent, text: colors.text },
};

export default function RootLayout() {
  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabase}>
      <DatabaseContextProvider>
        <ThemeProvider value={liftTheme}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="exercises/index" options={{ title: 'Exercise Library' }} />
            <Stack.Screen name="exercises/create" options={{ title: 'New Exercise', presentation: 'modal' }} />
            <Stack.Screen name="exercises/[id]" options={{ title: 'Exercise Details' }} />
          </Stack>
        </ThemeProvider>
      </DatabaseContextProvider>
    </SQLiteProvider>
  );
}
