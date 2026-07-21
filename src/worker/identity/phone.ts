/**
 * Lightweight UA-first phone normalizer — intentionally not `libphonenumber`
 * (bundle weight). Accepts local Ukrainian formats and general E.164 input;
 * see docs/plans/auth-registration-plan.md.
 *
 * Rules:
 * - `0XXXXXXXXX` (10 digits, starts with 0) → `+380XXXXXXXXX`
 * - `380XXXXXXXXX` (12 digits, no plus) → `+380XXXXXXXXX`
 * - `+380XXXXXXXXX` → passthrough after validation
 * - Any other `+<countrycode><digits>` (8-15 digits total per E.164) is
 *   accepted as valid E.164 without special UX, per the plan.
 */

const UA_LOCAL_RE = /^0\d{9}$/;
const UA_NO_PLUS_RE = /^380\d{9}$/;
const UA_E164_RE = /^\+380\d{9}$/;
const GENERIC_E164_RE = /^\+[1-9]\d{7,14}$/;

export class InvalidPhoneError extends Error {
  constructor() {
    super("invalid phone number");
    this.name = "InvalidPhoneError";
  }
}

function stripFormatting(input: string): string {
  return input.trim().replace(/[\s()-]/g, "");
}

/** Normalizes phone input to E.164 (`+<digits>`). Throws {@link InvalidPhoneError} otherwise. */
export function normalizePhoneToE164(rawInput: string): string {
  const input = stripFormatting(rawInput);

  if (UA_LOCAL_RE.test(input)) {
    return `+380${input.slice(1)}`;
  }
  if (UA_NO_PLUS_RE.test(input)) {
    return `+${input}`;
  }
  if (UA_E164_RE.test(input)) {
    return input;
  }
  if (GENERIC_E164_RE.test(input)) {
    return input;
  }

  throw new InvalidPhoneError();
}

export function isValidE164(input: string): boolean {
  try {
    normalizePhoneToE164(input);
    return true;
  } catch {
    return false;
  }
}
