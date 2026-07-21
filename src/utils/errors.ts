import { logger } from './logger';

/** A domain-safe error whose message may be shown to users without leaking SQL details. */
export class AppError extends Error {
  constructor(message: string, options?: { cause?: unknown; code?: string }) {
    super(message, { cause: options?.cause }); this.name = 'AppError'; this.code = options?.code;
  }
  readonly code?: string;
}

export function toAppError(error: unknown, message: string, code?: string): AppError {
  logger.error(code ?? 'application-error', error);
  return error instanceof AppError ? error : new AppError(message, { cause: error, code });
}

/** Returns only curated domain messages; raw database errors stay in development logs. */
export function getUserMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!(error instanceof AppError)) logger.error('unexpected-user-facing-error', error);
  return error instanceof AppError ? error.message : fallback;
}
