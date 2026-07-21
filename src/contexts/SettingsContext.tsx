import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useDatabase } from '@/hooks/useDatabase';
import { DEFAULT_SETTINGS, loadSettings, updateSetting } from '@/services/settingsService';
import type { AppSettingKey, AppSettings } from '@/types/settings';

interface SettingsContextValue { settings: AppSettings; loading: boolean; setSetting: <K extends AppSettingKey>(key: K, value: AppSettings[K]) => Promise<void>; refresh: () => Promise<void> }
const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: PropsWithChildren) {
  const db = useDatabase(); const [settings, setSettings] = useState(DEFAULT_SETTINGS); const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => { setSettings(await loadSettings(db)); setLoading(false); }, [db]);
  useEffect(() => { void refresh(); }, [refresh]);
  const change = useCallback(async <K extends AppSettingKey>(key: K, value: AppSettings[K]) => {
    await updateSetting(db, key, value); setSettings((current) => ({ ...current, [key]: value }));
  }, [db]);
  const value = useMemo(() => ({ settings, loading, setSetting: change, refresh }), [settings, loading, change, refresh]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
export function useSettings(): SettingsContextValue { const value = useContext(SettingsContext); if (!value) throw new Error('useSettings must be used in SettingsProvider'); return value; }

