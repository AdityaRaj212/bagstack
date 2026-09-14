/**
 * Precise Monetary Representation & Formatting
 * 
 * Rules:
 * 1. Money is stored as an integer of minor units (e.g., paise for INR, cents for USD).
 * 2. 1 INR = 100 paise. (e.g., ₹1,245.50 = 124550 paise).
 * 3. Never use floating-point arithmetic for financial persistence or operations.
 */

export interface MoneyFormatOptions {
  locale?: string;
  showSign?: boolean;
  compact?: boolean;
  hideDecimalsIfZero?: boolean;
}

const CURRENCY_DECIMALS: Record<string, number> = {
  INR: 2,
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  SGD: 2,
  AED: 2,
  CAD: 2,
  AUD: 2,
};

/**
 * Returns decimal places for currency (defaults to 2)
 */
export function getCurrencyDecimals(currency = 'INR'): number {
  return CURRENCY_DECIMALS[currency.toUpperCase()] ?? 2;
}

/**
 * Converts a major unit (e.g. 125.50) or string to integer minor units (12550).
 */
export function toMinorUnits(val: number | string, currency = 'INR'): number {
  if (typeof val === 'number') {
    if (isNaN(val)) return 0;
    val = val.toString();
  }
  const decimals = getCurrencyDecimals(currency);
  const trimmed = val.trim().replace(/,/g, '');
  if (!trimmed) return 0;

  const isNegative = trimmed.startsWith('-');
  const clean = trimmed.replace(/^[+-]/, '');

  const parts = clean.split('.');
  const whole = parts[0] || '0';
  let fraction = parts[1] || '';

  if (fraction.length > decimals) {
    // Round to required decimals
    const roundingDigit = parseInt(fraction[decimals], 10);
    fraction = fraction.slice(0, decimals);
    let intVal = BigInt(whole + fraction.padEnd(decimals, '0'));
    if (roundingDigit >= 5) {
      intVal += BigInt(1);
    }
    const finalVal = Number(intVal);
    return isNegative ? -finalVal : finalVal;
  }

  fraction = fraction.padEnd(decimals, '0');
  const result = Number(BigInt(whole + fraction));
  return isNegative ? -result : result;
}

/**
 * Converts minor units back to major number (for display or input editing).
 */
export function fromMinorUnits(minor: number, currency = 'INR'): number {
  const decimals = getCurrencyDecimals(currency);
  const divisor = Math.pow(10, decimals);
  return minor / divisor;
}

/**
 * Formats minor units into localized currency string.
 * Uses Indian numbering grouping for INR (e.g. ₹1,24,500.00).
 */
export function formatMoney(
  minorUnits: number,
  currency = 'INR',
  options: MoneyFormatOptions = {}
): string {
  const {
    locale = currency === 'INR' ? 'en-IN' : 'en-US',
    showSign = false,
    compact = false,
    hideDecimalsIfZero = true,
  } = options;

  const decimals = getCurrencyDecimals(currency);
  const isNegative = minorUnits < 0;
  const absMinor = Math.abs(minorUnits);
  const majorValue = absMinor / Math.pow(10, decimals);

  let formatted = '';

  if (compact && majorValue >= 100000) {
    if (locale === 'en-IN') {
      if (majorValue >= 10000000) {
        // Crores
        const cr = (majorValue / 10000000).toFixed(2);
        formatted = `₹${parseFloat(cr)} Cr`;
      } else {
        // Lakhs
        const lk = (majorValue / 100000).toFixed(2);
        formatted = `₹${parseFloat(lk)} L`;
      }
    } else {
      const formatter = new Intl.NumberFormat(locale, {
        notation: 'compact',
        style: 'currency',
        currency,
      });
      formatted = formatter.format(majorValue);
    }
  } else {
    const hasFraction = absMinor % Math.pow(10, decimals) !== 0;
    const minFrac = hideDecimalsIfZero && !hasFraction ? 0 : decimals;

    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: minFrac,
      maximumFractionDigits: decimals,
    });
    formatted = formatter.format(majorValue);
  }

  if (isNegative) {
    return `-${formatted}`;
  }
  if (showSign && minorUnits > 0) {
    return `+${formatted}`;
  }
  return formatted;
}

/**
 * Safe integer additions
 */
export function addMoney(a: number, b: number): number {
  return Math.round(a) + Math.round(b);
}

/**
 * Safe integer subtraction
 */
export function subtractMoney(a: number, b: number): number {
  return Math.round(a) - Math.round(b);
}

/**
 * Sum an array of minor units
 */
export function sumMoney(amounts: number[]): number {
  return amounts.reduce((acc, curr) => acc + Math.round(curr), 0);
}
