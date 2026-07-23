import { describe, expect, it } from 'vitest';

import { parseWorkoutNumericInput } from './workoutSetInputService';

describe('parseWorkoutNumericInput', () => {
  it('accepts whole numbers and decimal dots', () => {
    expect(parseWorkoutNumericInput('75')).toBe(75);
    expect(parseWorkoutNumericInput('75.5')).toBe(75.5);
  });

  it('accepts decimal commas used by localized keyboards', () => {
    expect(parseWorkoutNumericInput('75,5')).toBe(75.5);
  });

  it('returns null for empty or invalid input', () => {
    expect(parseWorkoutNumericInput('')).toBeNull();
    expect(parseWorkoutNumericInput('weight')).toBeNull();
  });
});
