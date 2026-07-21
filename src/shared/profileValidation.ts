/**
 * Shared profile field constants and shape checks used by both the client
 * form validators and the worker normalizer — single source of truth against drift.
 */

export const NAME_MAX_LENGTH = 100;
export const CITY_MAX_LENGTH = 100;
export const REGION_MAX_LENGTH = 100;
export const CLUB_MAX_LENGTH = 100;
export const NICKNAME_MAX_LENGTH = 100;
export const IPSC_MEMBER_NUMBER_MAX_LENGTH = 50;
export const IPSC_REGION_MAX_LENGTH = 5;
export const MAX_AGE_YEARS = 120;

/** Practical cap per RFC 5321 (mailbox 64 + '@' + domain up to 255, generously rounded). */
export const EMAIL_MAX_LENGTH = 254;

/** Ukrainian letters only (і/ї/є/ґ; no ы/э/ъ/ё), hyphen, space — no digits. */
export const UA_NAME_RE = /^[абвгґдеєжзиіїйклмнопрстуфхцчшщьюя\s-]+$/iu;
/** Latin letters, hyphen, space — no digits. */
export const LATIN_NAME_RE = /^[a-z\s-]+$/i;
export const CONTROL_CHAR_RE = /[\u0000-\u001f\u007f]/;
/** Latin + Cyrillic letters, digits, spaces, hyphens — no other punctuation. */
export const NICKNAME_RE = /^[a-z0-9а-яіїєґ\s-]+$/iu;
export const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Simple, non-RFC-exhaustive shape check — no email-verification loop in v1. */
export const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** ISO `YYYY-MM-DD`, not in the future, and no more than {@link MAX_AGE_YEARS} old. */
export function isValidBirthDate(value: string): boolean {
  if (!ISO_DATE_RE.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return false;
  }
  const now = Date.now();
  if (date.getTime() > now) {
    return false;
  }
  const ageMs = now - date.getTime();
  const maxAgeMs = MAX_AGE_YEARS * 365.25 * 24 * 60 * 60 * 1000;
  return ageMs <= maxAgeMs;
}

export function isValidNickname(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (CONTROL_CHAR_RE.test(trimmed)) return false;
  return NICKNAME_RE.test(trimmed);
}

export function isValidEmailShape(value: string): boolean {
  const email = value.trim().toLowerCase();
  return (
    email.length > 0 &&
    email.length <= EMAIL_MAX_LENGTH &&
    SIMPLE_EMAIL_RE.test(email)
  );
}
