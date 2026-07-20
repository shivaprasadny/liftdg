import { Component, createContext, useContext, type ErrorInfo, type PropsWithChildren, type ReactNode } from 'react';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

const DatabaseContext = createContext<SQLiteDatabase | null>(null);

export function DatabaseContextProvider({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  return <DatabaseContext.Provider value={database}>{children}</DatabaseContext.Provider>;
}

export function useDatabaseContext(): SQLiteDatabase {
  const database = useContext(DatabaseContext);
  if (!database) throw new Error('DatabaseContextProvider is missing');
  return database;
}

interface BoundaryState { error: Error | null; retryKey: number; }

export class DatabaseErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null, retryKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (__DEV__) console.error('Database initialization failed', error, info.componentStack);
  }

  private retry = (): void => this.setState((state) => ({ error: null, retryKey: state.retryKey + 1 }));

  render() {
    if (this.state.error) {
      return <View style={styles.errorScreen}>
        <Text style={styles.errorTitle}>LiftDG could not open its local database</Text>
        <Text style={styles.errorMessage}>Your data has not been deleted. Close and reopen the app, or try again.</Text>
        <Pressable accessibilityRole="button" onPress={this.retry} style={styles.retryButton}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      </View>;
    }
    return <View key={this.state.retryKey} style={styles.container}>{this.props.children}</View>;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 }, errorScreen: { flex: 1, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  errorTitle: { ...typography.heading, color: colors.text, textAlign: 'center' },
  errorMessage: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  retryButton: { minHeight: 50, paddingHorizontal: spacing.xl, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  retryText: { ...typography.label, color: colors.accentText },
});
