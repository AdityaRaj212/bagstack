import { describe, it, expect } from 'vitest';
import { evaluateAmountInput, formatIndianNumberString } from '../src/lib/amount-evaluator';

describe('formatIndianNumberString', () => {
  it('formats thousands correctly (50000 -> 50,000)', () => {
    expect(formatIndianNumberString('50000')).toBe('50,000');
  });

  it('formats lakhs correctly (100000 -> 1,00,000)', () => {
    expect(formatIndianNumberString('100000')).toBe('1,00,000');
  });

  it('formats crores correctly (10000000 -> 1,00,00,000)', () => {
    expect(formatIndianNumberString('10000000')).toBe('1,00,00,000');
  });

  it('preserves decimals and operators in expressions', () => {
    expect(formatIndianNumberString('50000.50 + 100000')).toBe('50,000.50 + 1,00,000');
  });

  it('leaves numbers under 1000 unchanged', () => {
    expect(formatIndianNumberString('500')).toBe('500');
    expect(formatIndianNumberString('99')).toBe('99');
  });
});

describe('evaluateAmountInput', () => {
  it('parses formatted Indian numbers with commas correctly', () => {
    const res = evaluateAmountInput('50,000');
    expect(res.hasExpression).toBe(false);
    expect(res.isValid).toBe(true);
    expect(res.value).toBe(50000);
    expect(res.isPositive).toBe(true);
  });

  it('evaluates arithmetic expressions containing commas', () => {
    const res = evaluateAmountInput('1,00,000 + 50,000 - 2,500');
    expect(res.hasExpression).toBe(true);
    expect(res.isValid).toBe(true);
    expect(res.value).toBe(147500);
    expect(res.isPositive).toBe(true);
  });

  it('parses normal positive numbers correctly', () => {
    const res = evaluateAmountInput('1500');
    expect(res.hasExpression).toBe(false);
    expect(res.isValid).toBe(true);
    expect(res.value).toBe(1500);
    expect(res.isPositive).toBe(true);
    expect(res.errorMessage).toBeUndefined();
  });

  it('evaluates addition correctly', () => {
    const res = evaluateAmountInput('1200 + 450');
    expect(res.hasExpression).toBe(true);
    expect(res.isValid).toBe(true);
    expect(res.value).toBe(1650);
    expect(res.isPositive).toBe(true);
  });

  it('evaluates mixed addition and subtraction correctly', () => {
    const res = evaluateAmountInput('1200 + 450 - 50');
    expect(res.hasExpression).toBe(true);
    expect(res.isValid).toBe(true);
    expect(res.value).toBe(1600);
    expect(res.isPositive).toBe(true);
  });

  it('handles decimal precision correctly', () => {
    const res = evaluateAmountInput('100.50 + 20.25 - 5.50');
    expect(res.hasExpression).toBe(true);
    expect(res.isValid).toBe(true);
    expect(res.value).toBe(115.25);
    expect(res.isPositive).toBe(true);
  });

  it('rejects expressions that yield a negative or zero net sum', () => {
    const negativeRes = evaluateAmountInput('500 - 800');
    expect(negativeRes.hasExpression).toBe(true);
    expect(negativeRes.value).toBe(-300);
    expect(negativeRes.isPositive).toBe(false);
    expect(negativeRes.errorMessage).toBe('Net sum must be positive (> ₹0)');

    const zeroRes = evaluateAmountInput('500 - 500');
    expect(zeroRes.hasExpression).toBe(true);
    expect(zeroRes.value).toBe(0);
    expect(zeroRes.isPositive).toBe(false);
    expect(zeroRes.errorMessage).toBe('Net sum must be positive (> ₹0)');
  });

  it('identifies incomplete expressions while typing', () => {
    const res = evaluateAmountInput('1200 +');
    expect(res.hasExpression).toBe(true);
    expect(res.isValid).toBe(false);
    expect(res.isPositive).toBe(false);
    expect(res.errorMessage).toBe('Complete the calculation...');
  });
});
