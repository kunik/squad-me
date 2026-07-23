/**
 * Display-only masking for contact identifiers across the UI (sidebar,
 * notifications, change-phone readout, etc.). Not for logs — worker
 * `maskPhone` stays separate. Phone form inputs stay unmasked while editing.
 */

/**
 * Masks an E.164 (or digit) phone for UI: replaces up to 5 middle digits with `*`,
 * keeping leading/trailing digits recognizable. Short numbers leave at least one
 * digit visible at each end when possible; 1–2 digit values are fully obscured.
 */
export function maskPhoneE164(phone: string): string {
  const s = phone.trim();
  if (!s) return s;

  const digitIndices: number[] = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i]! >= "0" && s[i]! <= "9") digitIndices.push(i);
  }

  const digitCount = digitIndices.length;
  if (digitCount === 0) return s;

  // Prefer five middle digits; always try to keep one digit at each end.
  const maskLen = Math.min(5, Math.max(0, digitCount - 2));
  const chars = [...s];

  if (maskLen === 0) {
    for (const i of digitIndices) chars[i] = "*";
    return chars.join("");
  }

  const startDigits = Math.floor((digitCount - maskLen) / 2);
  for (let d = startDigits; d < startDigits + maskLen; d++) {
    chars[digitIndices[d]!] = "*";
  }
  return chars.join("");
}

/**
 * Masks an email for UI: `{up to 3 local chars}***@***.{tld}` where `tld` is the
 * last label after the final `.`. Short local parts use whatever is available.
 * Domains without a dot fall back to `{prefix}***@***`.
 */
export function maskEmail(email: string): string {
  const trimmed = email.trim();
  if (!trimmed) return trimmed;

  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) {
    return `${trimmed.slice(0, Math.min(3, trimmed.length))}***`;
  }

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const localPrefix = local.slice(0, Math.min(3, local.length));
  const lastDot = domain.lastIndexOf(".");
  if (lastDot < 0 || lastDot === domain.length - 1) {
    return `${localPrefix}***@***`;
  }

  const tld = domain.slice(lastDot + 1);
  return `${localPrefix}***@***.${tld}`;
}
