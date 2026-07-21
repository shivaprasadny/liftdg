type Context = Record<string, string | number | boolean | null | undefined>;
function safeContext(context?: Context): Context | undefined { return context ? Object.fromEntries(Object.entries(context).filter(([key]) => !/workout|backup|biometric|notes|weight|reps/i.test(key))) : undefined; }
export const logger = {
  debug(message: string, context?: Context): void { if (__DEV__) console.debug(`[LiftDG] ${message}`, safeContext(context)); },
  info(message: string, context?: Context): void { if (__DEV__) console.info(`[LiftDG] ${message}`, safeContext(context)); },
  warn(message: string, context?: Context): void { console.warn(`[LiftDG] ${message}`, safeContext(context)); },
  /** Error causes stay in development logs; production logs contain only the curated event name. */
  error(message: string, error?: unknown, context?: Context): void { if (__DEV__) console.error(`[LiftDG] ${message}`, error, safeContext(context)); else console.error(`[LiftDG] ${message}`); },
};
