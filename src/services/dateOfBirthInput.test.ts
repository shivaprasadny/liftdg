import { describe, expect, it } from 'vitest';
import { displayDateToIso, isoDateToDisplay, maskDateOfBirthInput } from './bodyMeasurementService';

describe('date of birth input', () => {
  it('automatically inserts separators after month and day', () => {
    expect(maskDateOfBirthInput('1')).toBe('1');
    expect(maskDateOfBirthInput('12')).toBe('12/');
    expect(maskDateOfBirthInput('123')).toBe('12/3');
    expect(maskDateOfBirthInput('1231')).toBe('12/31/');
    expect(maskDateOfBirthInput('12312')).toBe('12/31/2');
    expect(maskDateOfBirthInput('12311992')).toBe('12/31/1992');
  });
  it('ignores non-numeric characters and limits input to eight digits', () => expect(maskDateOfBirthInput('12a31-199299')).toBe('12/31/1992'));
  it('allows backspace across an automatic separator',()=>expect(maskDateOfBirthInput('12','12/')).toBe('1'));
  it('converts display dates to canonical ISO storage and back', () => {
    expect(displayDateToIso('05/10/1992')).toBe('1992-05-10');
    expect(isoDateToDisplay('1992-05-10')).toBe('05/10/1992');
  });
  it('rejects incomplete and impossible dates', () => {
    expect(() => displayDateToIso('05/10/')).toThrow(/MM\/DD\/YYYY/);
    expect(() => displayDateToIso('02/31/1992')).toThrow(/valid date/);
  });
});
