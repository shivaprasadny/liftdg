import { router, Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text } from 'react-native';

import { DatabaseContextProvider, DatabaseErrorBoundary } from '@/contexts/DatabaseContext';
import { PlanDraftProvider } from '@/contexts/PlanDraftContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { AppThemeProvider } from '@/contexts/ThemeContext';
import { AppLockGate } from '@/components/AppLockGate';
import { OnboardingGate } from '@/components/OnboardingGate';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { initializeDatabase } from '@/database/database';
import { DATABASE_NAME } from '@/database/schema';

/** Modal-presented screens get no back arrow from React Navigation by default — without this, the only way out is an easy-to-miss swipe-down (iOS) or nothing at all (Android). */
function ModalCancelButton() {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={() => router.back()} hitSlop={12} style={modalHeaderStyles.button}>
      <Text style={modalHeaderStyles.text}>Cancel</Text>
    </Pressable>
  );
}
const modalHeaderStyles = StyleSheet.create({
  button: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center', paddingRight: spacing.md },
  text: { ...typography.body, color: colors.accent },
});

export default function RootLayout() {
  return (
    <DatabaseErrorBoundary>
      <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabase}>
        <DatabaseContextProvider>
          <SettingsProvider>
          <PlanDraftProvider>
            <AppThemeProvider>
              <AppLockGate>
                <OnboardingGate>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="exercises/index" options={{ title: 'Exercise Library' }} />
            <Stack.Screen name="exercises/create" options={{ title: 'New Exercise', presentation: 'modal', headerLeft: () => <ModalCancelButton /> }} />
            <Stack.Screen name="exercises/edit/[id]" options={{ title: 'Edit Exercise', presentation: 'modal', headerLeft: () => <ModalCancelButton /> }} />
            <Stack.Screen name="exercises/[id]" options={{ title: 'Exercise Details' }} />
            <Stack.Screen name="plans/create" options={{ title: 'Create Plan' }} />
            <Stack.Screen name="plans/edit/[id]" options={{ title: 'Edit Plan' }} />
            <Stack.Screen name="plans/select-exercises" options={{ title: 'Add Exercises', presentation: 'modal', headerLeft: () => <ModalCancelButton /> }} />
            <Stack.Screen name="plans/[id]" options={{ title: 'Plan Details' }} />
            <Stack.Screen name="plans/groups/[id]" options={{ title: 'Group Plan Exercises' }} />
            <Stack.Screen name="workout/active" options={{ title: 'Active Workout', headerBackVisible: false }} />
            <Stack.Screen name="workout/add-exercises" options={{ title: 'Add Exercises', presentation: 'modal', headerLeft: () => <ModalCancelButton /> }} />
            <Stack.Screen name="workout/summary" options={{ title: 'Workout Summary', headerBackVisible: false }} />
            <Stack.Screen name="workout/[id]" options={{ title: 'Workout Details' }} />
            <Stack.Screen name="workout/edit/[id]" options={{ title: 'Edit Workout' }} />
            <Stack.Screen name="workout/create-group" options={{ title: 'Create Group', presentation: 'modal', headerLeft: () => <ModalCancelButton /> }} />
            <Stack.Screen name="cardio/create" options={{ title: 'Cardio Session' }} />
            <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
            <Stack.Screen name="settings/data" options={{ title: 'Data Management' }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          </Stack>
                </OnboardingGate>
              </AppLockGate>
            </AppThemeProvider>
          </PlanDraftProvider>
          </SettingsProvider>
        </DatabaseContextProvider>
      </SQLiteProvider>
    </DatabaseErrorBoundary>
  );
}
