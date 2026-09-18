import { describe, it, expect } from 'vitest';
import { formatDateDMY, formatDateWithWeekday, formatMonthYear, parseDMYToISO } from '../src/lib/date';

describe('date utilities', () => {
  it('formats YYYY-MM-DD into DD-MM-YYYY', () => {
    expect(formatDateDMY('2026-09-08')).toBe('08-09-2026');
    expect(formatDateDMY('2024-01-01')).toBe('01-01-2024');
    expect(formatDateDMY('2025-12-31')).toBe('31-12-2025');
  });

  it('formats ISO timestamp strings into DD-MM-YYYY', () => {
    expect(formatDateDMY('2026-09-08T14:32:00.000Z')).toBe('08-09-2026');
  });

  it('handles null or empty date gracefully', () => {
    expect(formatDateDMY('')).toBe('');
    expect(formatDateDMY(null)).toBe('');
    expect(formatDateDMY(undefined)).toBe('');
  });

  it('formats date with weekday accurately', () => {
    // 2026-09-08 is a Tuesday
    expect(formatDateWithWeekday('2026-09-08')).toBe('08-09-2026 (Tue)');
  });

  it('formats month and year', () => {
    expect(formatMonthYear('2026-09')).toBe('Sep 2026');
    expect(formatMonthYear('2024-01')).toBe('Jan 2024');
  });

  it('converts DD-MM-YYYY back to ISO YYYY-MM-DD', () => {
    expect(parseDMYToISO('08-09-2026')).toBe('2026-09-08');
    expect(parseDMYToISO('8/9/2026')).toBe('2026-09-08');
  });
});
