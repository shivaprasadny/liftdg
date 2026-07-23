/** Accepts both decimal dots and decimal commas from mobile numeric keyboards. */
export function parseWorkoutNumericInput(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (normalized === '') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
