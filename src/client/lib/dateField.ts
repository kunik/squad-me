/** ISO calendar date `YYYY-MM-DD` helpers for the profile birth-date control. */

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type CalendarDay = {
  /** Local calendar date as ISO `YYYY-MM-DD`. */
  iso: string;
  day: number;
  /** True when the cell belongs to the adjacent month. */
  outside: boolean;
};

export function parseIsoDate(value: string): { year: number; month: number; day: number } | null {
  const match = ISO_DATE_RE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!isValidYmd(year, month, day)) return null;
  return { year, month, day };
}

export function toIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function isValidYmd(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(year, month - 1, day);
  return (
    probe.getFullYear() === year && probe.getMonth() === month - 1 && probe.getDate() === day
  );
}

/** Compare ISO dates lexicographically (valid for zero-padded `YYYY-MM-DD`). */
export function compareIsoDates(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function todayIsoDate(now = new Date()): string {
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * Build a Monday-first month grid (6×7) including leading/trailing days from
 * adjacent months so the layout stays stable.
 */
export function buildMonthGrid(year: number, month: number): CalendarDay[] {
  const first = new Date(year, month - 1, 1);
  // JS: Sun=0 … Sat=6 → Monday-first index 0…6
  const mondayIndex = (first.getDay() + 6) % 7;
  const start = new Date(year, month - 1, 1 - mondayIndex);
  const cells: CalendarDay[] = [];

  for (let i = 0; i < 42; i++) {
    const cell = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const y = cell.getFullYear();
    const m = cell.getMonth() + 1;
    const d = cell.getDate();
    cells.push({
      iso: toIsoDate(y, m, d),
      day: d,
      outside: m !== month,
    });
  }

  return cells;
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const shifted = new Date(year, month - 1 + delta, 1);
  return { year: shifted.getFullYear(), month: shifted.getMonth() + 1 };
}

export function formatIsoDisplay(iso: string, locale: "ua" | "en"): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return "";
  const date = new Date(parsed.year, parsed.month - 1, parsed.day);
  return new Intl.DateTimeFormat(locale === "ua" ? "uk-UA" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

const DISPLAY_DATE_RE = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/;

/**
 * Parse a user-typed calendar date. Accepts `DD.MM.YYYY`, `DD/MM/YYYY`,
 * `DD-MM-YYYY`, and ISO `YYYY-MM-DD`.
 */
export function parseDisplayDate(
  text: string,
): { year: number; month: number; day: number } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const iso = parseIsoDate(trimmed);
  if (iso) return iso;

  const match = DISPLAY_DATE_RE.exec(trimmed);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!isValidYmd(year, month, day)) return null;
  return { year, month, day };
}

export function monthLabel(year: number, month: number, locale: "ua" | "en"): string {
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat(locale === "ua" ? "uk-UA" : "en-GB", {
    month: "long",
    year: "numeric",
  }).format(date);
}

/** Short weekday labels Monday→Sunday for the calendar header. */
export function weekdayLabels(locale: "ua" | "en"): string[] {
  const formatter = new Intl.DateTimeFormat(locale === "ua" ? "uk-UA" : "en-GB", {
    weekday: "short",
  });
  // 2024-01-01 was a Monday
  return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2024, 0, 1 + i)));
}

export function yearOptions(maxIso: string, span = 120): number[] {
  const max = parseIsoDate(maxIso);
  const maxYear = max?.year ?? new Date().getFullYear();
  const minYear = maxYear - span;
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);
  return years;
}
