/**
 * Date Formatting Utilities
 * Standardizes user-facing dates to DD-MM-YYYY format across the application.
 * Database persistence and API contracts remain ISO (YYYY-MM-DD) for SQL indexing.
 */

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Parses any date string (YYYY-MM-DD or ISO timestamp) into year, month (1-indexed), day
 */
export function parseDateParts(dateStr?: string | null): { year: number; month: number; day: number } | null {
  if (!dateStr) return null;
  const clean = dateStr.trim();
  if (!clean) return null;

  // If ISO with time e.g. 2026-09-08T12:00:00Z
  const dateOnly = clean.includes('T') ? clean.split('T')[0] : clean.split(' ')[0];
  const parts = dateOnly.split('-');

  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return { year, month, day };
    }
  }

  // Fallback via Date object
  const d = new Date(clean);
  if (isNaN(d.getTime())) return null;
  return {
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

/**
 * Formats date into DD-MM-YYYY string (e.g. "08-09-2026").
 * Replaces raw YYYY-MM-DD everywhere in the user interface.
 */
export function formatDateDMY(dateStr?: string | null): string {
  if (!dateStr) return '';
  const parsed = parseDateParts(dateStr);
  if (!parsed) return dateStr;

  const dd = parsed.day.toString().padStart(2, '0');
  const mm = parsed.month.toString().padStart(2, '0');
  const yyyy = parsed.year.toString();

  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Formats date into DD-MM-YYYY with weekday abbreviation (e.g. "08-09-2026 (Tue)").
 * Ideal for date picker triggers and headers.
 */
export function formatDateWithWeekday(dateStr?: string | null): string {
  if (!dateStr) return '';
  const parsed = parseDateParts(dateStr);
  if (!parsed) return dateStr;

  const dd = parsed.day.toString().padStart(2, '0');
  const mm = parsed.month.toString().padStart(2, '0');
  const yyyy = parsed.year.toString();

  const d = new Date(parsed.year, parsed.month - 1, parsed.day);
  const weekday = WEEKDAY_NAMES_SHORT[d.getDay()] || '';

  return `${dd}-${mm}-${yyyy}${weekday ? ` (${weekday})` : ''}`;
}

/**
 * Formats a YYYY-MM or YYYY-MM-DD into "Month Year" (e.g. "Sep 2026")
 */
export function formatMonthYear(monthStr?: string | null): string {
  if (!monthStr) return '';
  const parts = monthStr.split('-');
  if (parts.length >= 2) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
      return `${MONTH_NAMES_SHORT[m - 1]} ${y}`;
    }
  }
  return monthStr;
}

/**
 * Converts user input in DD-MM-YYYY format back to ISO YYYY-MM-DD
 */
export function parseDMYToISO(dmyStr: string): string | null {
  const parts = dmyStr.trim().split(/[-/.]/);
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const yyyy = year < 100 ? (year > 50 ? 1900 + year : 2000 + year) : year;
  return `${yyyy.toString()}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}
