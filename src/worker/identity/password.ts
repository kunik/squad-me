import { scryptAsync } from "@noble/hashes/scrypt.js";

/**
 * scrypt params per docs/plans/auth-registration-plan.md Phase 1.
 * N=2^15 keeps peak memory ~32 MiB (128 * r * N bytes) — well under noble's
 * default 1 GiB `maxmem` guard. A CPU-time benchmark on deployed Workers
 * (not available in this sandbox) is a pending follow-up before raising
 * traffic; see the session log.
 */
const SCRYPT_N = 2 ** 15;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_DK_LEN = 32;
const SALT_BYTES = 16;

export const PASSWORD_MIN_LENGTH = 8;
/** Hard cap enforced before hashing — protects against CPU-exhaustion DoS via oversized inputs. */
export const PASSWORD_MAX_LENGTH = 128;

export class PasswordLengthError extends Error {
  constructor() {
    super(
      `password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`,
    );
    this.name = "PasswordLengthError";
  }
}

/** Enforces the length policy. Callers must run this before any hashing work. */
export function assertPasswordLength(password: string): void {
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    throw new PasswordLengthError();
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Encodes as `scrypt$N$r$p$saltB64$hashB64` so params can evolve without a migration. */
function encode(
  params: { N: number; r: number; p: number },
  salt: Uint8Array,
  hash: Uint8Array,
): string {
  return `scrypt$${params.N}$${params.r}$${params.p}$${toBase64(salt)}$${toBase64(hash)}`;
}

function decode(stored: string): {
  N: number;
  r: number;
  p: number;
  salt: Uint8Array;
  hash: Uint8Array;
} | null {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    return null;
  }
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return null;
  }
  try {
    return { N, r, p, salt: fromBase64(parts[4]), hash: fromBase64(parts[5]) };
  } catch {
    return null;
  }
}

/** Hashes a plaintext password. Throws {@link PasswordLengthError} outside the length policy. */
export async function hashPassword(password: string): Promise<string> {
  assertPasswordLength(password);
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  const hash = await scryptAsync(password, salt, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    dkLen: SCRYPT_DK_LEN,
  });
  return encode({ N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }, salt, hash);
}

/**
 * Verifies a plaintext password against a stored hash in constant time.
 * Returns `false` (never throws) for malformed hashes or over-length input,
 * so callers can always give the generic "invalid credentials" response.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return false;
  }
  const decoded = decode(stored);
  if (!decoded) {
    return false;
  }
  const candidate = await scryptAsync(password, decoded.salt, {
    N: decoded.N,
    r: decoded.r,
    p: decoded.p,
    dkLen: decoded.hash.length,
  });
  return constantTimeEqual(candidate, decoded.hash);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
