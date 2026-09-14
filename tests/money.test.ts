import { describe, it, expect } from 'vitest';
import { toMinorUnits, fromMinorUnits, formatMoney, sumMoney } from '../src/lib/money';

describe('Financial precision and format calculations', () => {
  it('accurately converts INR rupees to paise without floating-point drift', () => {
    expect(toMinorUnits(850, 'INR')).toBe(85000);
    expect(toMinorUnits('850', 'INR')).toBe(85000);
    expect(toMinorUnits('100000.50', 'INR')).toBe(10000050);
    expect(toMinorUnits(0.1 + 0.2, 'INR')).toBe(30); // Eliminates standard 0.30000000000000004 floating drift!
    expect(toMinorUnits('1,24,500.75', 'INR')).toBe(12450075);
  });

  it('accurately converts minor units back to major units', () => {
    expect(fromMinorUnits(85000, 'INR')).toBe(850);
    expect(fromMinorUnits(12450075, 'INR')).toBe(124500.75);
  });

  it('formats INR using standard Indian numbering commas', () => {
    const formatted = formatMoney(12450000, 'INR');
    // Indian format produces ₹1,24,500 (or with decimals)
    expect(formatted).toContain('1,24,500');
    expect(formatted).toContain('₹');
  });

  it('sums split amounts with exact integer precision', () => {
    const splits = [350000, 100000, 50000]; // 3500, 1000, 500
    const total = sumMoney(splits);
    expect(total).toBe(500000); // exactly 5000.00
  });

  it('correctly handles negative values and signs', () => {
    expect(toMinorUnits('-850.50', 'INR')).toBe(-85050);
    const formattedNegative = formatMoney(-85000, 'INR');
    expect(formattedNegative).toContain('-₹');
  });
});
