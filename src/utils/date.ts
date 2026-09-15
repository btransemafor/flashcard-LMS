import { format, parseISO, isValid, differenceInCalendarDays, addDays, startOfDay } from 'date-fns';

/** Returns the local calendar date (yyyy-MM-dd) for a given Date, ignoring time-of-day. */
export function toLocalDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Returns today's local calendar date key. */
export function todayKey(): string {
  return toLocalDateKey(new Date());
}

/** Converts a Date to a full ISO timestamp string (UTC). */
export function toISOTimestamp(date: Date): string {
  return date.toISOString();
}

/** Safely parses a value (string, number/serial date, or Date) into an ISO timestamp, or null. */
export function parseToISOOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) {
    return isValid(value) ? value.toISOString() : null;
  }
  if (typeof value === 'number') {
    // Excel serial date (days since 1899-12-30)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = value * 24 * 60 * 60 * 1000;
    const d = new Date(excelEpoch.getTime() + ms);
    return isValid(d) ? d.toISOString() : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = parseISO(trimmed);
    if (isValid(parsed)) return parsed.toISOString();
    const fallback = new Date(trimmed);
    if (isValid(fallback)) return fallback.toISOString();
    return null;
  }
  return null;
}

/**
 * Compares a nextReview ISO timestamp against "today" using LOCAL calendar dates
 * (not raw millisecond comparison) to avoid timezone-boundary bugs.
 * Returns true if the card is due (nextReview <= today) or has never been scheduled.
 */
export function isDueByLocalCalendar(nextReview: string | null, referenceDate: Date = new Date()): boolean {
  if (!nextReview) return true; // never scheduled => treated as new/due
  const parsed = parseISO(nextReview);
  if (!isValid(parsed)) return true;
  const diff = differenceInCalendarDays(startOfDay(referenceDate), startOfDay(parsed));
  return diff >= 0;
}

export function addDaysISO(fromDate: Date, days: number): string {
  return addDays(fromDate, days).toISOString();
}

export function formatDisplayDate(iso: string | null, pattern = 'dd/MM/yyyy'): string {
  if (!iso) return '—';
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return '—';
  return format(parsed, pattern);
}

export function formatDisplayDateTime(iso: string | null): string {
  if (!iso) return '—';
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return '—';
  return format(parsed, 'dd/MM/yyyy HH:mm');
}

export function daysUntil(iso: string | null, referenceDate: Date = new Date()): number | null {
  if (!iso) return null;
  const parsed = parseISO(iso);
  if (!isValid(parsed)) return null;
  return differenceInCalendarDays(startOfDay(parsed), startOfDay(referenceDate));
}
