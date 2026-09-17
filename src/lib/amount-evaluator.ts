/**
 * Amount Input Arithmetic Evaluator
 * Supports real-time addition and subtraction evaluation (e.g. 1200 + 450 - 50)
 * Enforces positive net sum validation.
 */

export interface AmountEvaluation {
  hasExpression: boolean;
  isValid: boolean;
  value: number; // In major units, e.g. 1600
  isPositive: boolean;
  errorMessage?: string;
}

export function evaluateAmountInput(raw: string): AmountEvaluation {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { hasExpression: false, isValid: false, value: 0, isPositive: false };
  }

  // Check if expression contains + or - (excluding a single leading sign)
  const hasExpression = /[+\-]/.test(trimmed.slice(1)) || trimmed.includes('+');

  // Strip spaces for calculation
  const expr = trimmed.replace(/\s+/g, '');

  // If it's just a standard single number
  if (!hasExpression) {
    const num = parseFloat(expr);
    const valid = !isNaN(num) && /^\d*(\.\d{0,2})?$/.test(expr);
    return {
      hasExpression: false,
      isValid: valid,
      value: isNaN(num) ? 0 : num,
      isPositive: num > 0,
      errorMessage: num <= 0 && expr !== '' ? 'Amount must be greater than 0' : undefined,
    };
  }

  // If expression ends with a trailing operator or dot, it's still being typed
  if (/[+\-.]$/.test(expr)) {
    return {
      hasExpression: true,
      isValid: false,
      value: 0,
      isPositive: false,
      errorMessage: 'Complete the calculation...',
    };
  }

  try {
    // Tokenize additions and subtractions preserving signs
    const tokens = expr.match(/[+-]?[^+-]+/g);
    if (!tokens) {
      return { hasExpression: true, isValid: false, value: 0, isPositive: false };
    }

    let sum = 0;
    for (const token of tokens) {
      const num = parseFloat(token);
      if (isNaN(num)) {
        return {
          hasExpression: true,
          isValid: false,
          value: 0,
          isPositive: false,
          errorMessage: 'Invalid number in calculation',
        };
      }
      sum += num;
    }

    // Round to 2 decimal places to avoid floating point precision quirks
    sum = Math.round(sum * 100) / 100;

    return {
      hasExpression: true,
      isValid: true,
      value: sum,
      isPositive: sum > 0,
      errorMessage: sum <= 0 ? 'Net sum must be positive (> ₹0)' : undefined,
    };
  } catch {
    return {
      hasExpression: true,
      isValid: false,
      value: 0,
      isPositive: false,
      errorMessage: 'Calculation error',
    };
  }
}
