import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';

import { DatabaseContextProvider, DatabaseErrorBoundary } from '@/contexts/DatabaseContext';
import { PlanDraftProvider } from '@/contexts/PlanDraftContext';
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
    <DatabaseErrorBoundary>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabase}>
        <DatabaseContextProvider>
          <PlanDraftProvider>
            <ThemeProvider value={liftTheme}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="exercises/index" options={{ title: 'Exercise Library' }} />
            <Stack.Screen name="exercises/create" options={{ title: 'New Exercise', presentation: 'modal' }} />
            <Stack.Screen name="exercises/edit/[id]" options={{ title: 'Edit Exercise', presentation: 'modal' }} />
            <Stack.Screen name="exercises/[id]" options={{ title: 'Exercise Details' }} />
            <Stack.Screen name="plans/create" options={{ title: 'Create Plan' }} />
            <Stack.Screen name="plans/edit/[id]" options={{ title: 'Edit Plan' }} />
            <Stack.Screen name="plans/select-exercises" options={{ title: 'Add Exercises', presentation: 'modal' }} />
            <Stack.Screen name="plans/[id]" options={{ title: 'Plan Details' }} />
            <Stack.Screen name="workout/active" options={{ title: 'Active Workout', headerBackVisible: false }} />
            <Stack.Screen name="workout/add-exercises" options={{ title: 'Add Exercises', presentation: 'modal' }} />
            <Stack.Screen name="workout/summary" options={{ title: 'Workout Summary', headerBackVisible: false }} />
          </Stack>
            </ThemeProvider>
          </PlanDraftProvider>
        </DatabaseContextProvider>
      </SQLiteProvider>
    </DatabaseErrorBoundary>
  );
}
