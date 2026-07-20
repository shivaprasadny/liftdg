export function getUserMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (__DEV__) console.error(error);
  return fallback;
}
