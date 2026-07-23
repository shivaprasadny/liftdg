import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppInput } from '@/components/AppInput';
import { AppScreen } from '@/components/AppScreen';
import { SettingsRow } from '@/components/SettingsRow';
import { SettingsSection } from '@/components/SettingsSection';
import { SettingsToggle } from '@/components/SettingsToggle';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useSettings } from '@/contexts/SettingsContext';
import { useDatabase } from '@/hooks/useDatabase';
import { clearGoalHistory } from '@/repositories/hydrationGoalHistoryRepository';
import { deleteAllWaterEntries } from '@/repositories/waterEntryRepository';
import { DEFAULT_SETTINGS } from '@/services/settingsService';
import { exportHydrationCsv } from '@/services/csvService';
import { exportHydrationJson } from '@/services/hydrationBackupService';
import { isHydrationResetConfirmed } from '@/services/hydrationService';
import { getUserMessage } from '@/utils/errors';

const CELEBRATED_DATE_KEY = 'liftdg:hydration:celebrated-date';

/** A dedicated, deliberately unhurried screen: typed confirmation, then a second explicit alert, before any deletion. */
export default function HydrationResetConfirmationScreen() {
  const db = useDatabase();
  const { settings, setSetting } = useSettings();
  const [confirmText, setConfirmText] = useState('');
  const [alsoResetSettings, setAlsoResetSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const canDelete = isHydrationResetConfirmed(confirmText);

  const runExport = async (task: () => Promise<void>) => {
    try { await task(); } catch (error) { Alert.alert('Export failed', getUserMessage(error)); }
  };

  const performReset = async () => {
    setBusy(true);
    try {
      await deleteAllWaterEntries(db);
      await clearGoalHistory(db);
      await AsyncStorage.removeItem(CELEBRATED_DATE_KEY);
      await setSetting('hydrationHomeExpanded', false);
      await setSetting('hydrationHomeStatsPage', 0);
      if (alsoResetSettings) {
        await setSetting('dailyWaterGoalMl', DEFAULT_SETTINGS.dailyWaterGoalMl);
        await setSetting('defaultServingSizeMl', DEFAULT_SETTINGS.defaultServingSizeMl);
        await setSetting('waterUnit', DEFAULT_SETTINGS.waterUnit);
        await setSetting('hydrationCelebration', DEFAULT_SETTINGS.hydrationCelebration);
        await setSetting('rememberHydrationExpansion', DEFAULT_SETTINGS.rememberHydrationExpansion);
      }
      Alert.alert('Hydration data deleted.', undefined, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error) { Alert.alert('Reset failed', getUserMessage(error)); }
    finally { setBusy(false); }
  };

  const confirmDelete = () => {
    Alert.alert('Delete all hydration data permanently?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Permanently', style: 'destructive', onPress: () => void performReset() },
    ]);
  };

  return (
    <AppScreen scroll>
      <View style={styles.warningBlock}>
        <Text style={styles.warningTitle}>Reset Hydration Data?</Text>
        <Text style={styles.warningBody}>This will permanently delete:</Text>
        <Text style={styles.bullet}>• All water entries</Text>
        <Text style={styles.bullet}>• Daily hydration history</Text>
        <Text style={styles.bullet}>• Weekly, monthly, and yearly statistics</Text>
        <Text style={styles.bullet}>• Hydration streaks</Text>
        <Text style={styles.bullet}>• Hydration goal history</Text>
        <Text style={styles.warningBody}>This action cannot be undone. Your workouts, body data, profile, and other settings are never affected.</Text>
      </View>

      <SettingsSection title="Export Hydration Data First (Optional)">
        <SettingsRow label="Full entries (CSV)" onPress={() => void runExport(() => exportHydrationCsv(db, 'water-entries', settings.waterUnit, settings.dailyWaterGoalMl))} />
        <SettingsRow label="Daily summary (CSV)" onPress={() => void runExport(() => exportHydrationCsv(db, 'water-daily-summary', settings.waterUnit, settings.dailyWaterGoalMl))} />
        <SettingsRow label="Hydration backup (JSON)" onPress={() => void runExport(() => exportHydrationJson(db))} />
      </SettingsSection>

      <SettingsSection title="Reset Options">
        <SettingsToggle label="Also reset hydration settings (goal, serving, units, celebration)" value={alsoResetSettings} onChange={setAlsoResetSettings} />
      </SettingsSection>

      <View style={styles.confirmBlock}>
        <AppInput label="Type HYDRATION to confirm" placeholder="HYDRATION" value={confirmText} onChangeText={setConfirmText} autoCapitalize="characters" autoCorrect={false} />
        <AppButton label="Delete Hydration Data" variant="danger" disabled={!canDelete} loading={busy}
          accessibilityLabel={canDelete ? 'Delete Hydration Data button enabled' : 'Delete Hydration Data button disabled. Type HYDRATION to enable permanent deletion.'}
          onPress={confirmDelete} />
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  warningBlock: { gap: spacing.xs, marginBottom: spacing.lg },
  warningTitle: { ...typography.heading, color: colors.danger },
  warningBody: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  bullet: { ...typography.body, color: colors.text },
  confirmBlock: { gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.xxl },
});
