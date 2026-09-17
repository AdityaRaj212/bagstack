import { describe, it, expect } from 'vitest';
import { evaluateAmountInput } from '../src/lib/amount-evaluator';

describe('evaluateAmountInput', () => {
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
