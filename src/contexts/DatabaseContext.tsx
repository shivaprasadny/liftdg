import { createContext, useContext, type PropsWithChildren } from 'react';
import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';

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
