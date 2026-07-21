import type { Env } from "../env";

/**
 * OTP send limits — tuned so a few legitimate retries (refresh, typo,
 * resend) succeed before a hard block, while still capping SMS/Gateway cost.
 */
export const OTP_RESEND_COOLDOWN_MS = 30 * 1000;
/** Rolling window for phone/IP send caps (shorter than an hour so blocks clear faster). */
export const OTP_SEND_WINDOW_MS = 15 * 60 * 1000;
export const OTP_MAX_SENDS_PER_PHONE = 8;
export const OTP_MAX_SENDS_PER_IP = 20;
export const OTP_MAX_VERIFY_ATTEMPTS = 5;

export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export type OtpSendCheck =
  | { allowed: true }
  | { allowed: false; reason: "cooldown" | "phone_limit" | "ip_limit"; retryAfterSeconds: number };

/**
 * Checks the 30s resend cooldown and per-phone / per-IP send caps by
 * querying `auth_challenges` directly — the `(phone_e164, purpose, created_at)`
 * index backs the cooldown/phone-count lookups, `(ip_hash, created_at)` backs
 * the IP count.
 */
export async function checkOtpSendAllowed(
  env: Env,
  phoneE164: string,
  purpose: string,
  ipHash: string,
): Promise<OtpSendCheck> {
  const now = Date.now();

  const latest = await env.DB.prepare(
    `SELECT created_at FROM auth_challenges
     WHERE phone_e164 = ? AND purpose = ?
     ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(phoneE164, purpose)
    .first<{ created_at: string }>();

  if (latest) {
    const elapsedMs = now - new Date(latest.created_at).getTime();
    if (elapsedMs < OTP_RESEND_COOLDOWN_MS) {
      return {
        allowed: false,
        reason: "cooldown",
        retryAfterSeconds: Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsedMs) / 1000),
      };
    }
  }

  const windowStart = new Date(now - OTP_SEND_WINDOW_MS).toISOString();

  const phoneCount = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM auth_challenges
     WHERE phone_e164 = ? AND purpose = ? AND created_at > ?`,
  )
    .bind(phoneE164, purpose, windowStart)
    .first<{ n: number }>();
  if ((phoneCount?.n ?? 0) >= OTP_MAX_SENDS_PER_PHONE) {
    return {
      allowed: false,
      reason: "phone_limit",
      retryAfterSeconds: await retryAfterForWindow(
        env,
        `SELECT created_at FROM auth_challenges
         WHERE phone_e164 = ? AND purpose = ? AND created_at > ?
         ORDER BY created_at ASC LIMIT 1`,
        [phoneE164, purpose, windowStart],
        now,
      ),
    };
  }

  const ipCount = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM auth_challenges
     WHERE ip_hash = ? AND created_at > ?`,
  )
    .bind(ipHash, windowStart)
    .first<{ n: number }>();
  if ((ipCount?.n ?? 0) >= OTP_MAX_SENDS_PER_IP) {
    return {
      allowed: false,
      reason: "ip_limit",
      retryAfterSeconds: await retryAfterForWindow(
        env,
        `SELECT created_at FROM auth_challenges
         WHERE ip_hash = ? AND created_at > ?
         ORDER BY created_at ASC LIMIT 1`,
        [ipHash, windowStart],
        now,
      ),
    };
  }

  return { allowed: true };
}

/** Seconds until the oldest challenge in the window ages out of the rolling window. */
async function retryAfterForWindow(
  env: Env,
  sql: string,
  binds: unknown[],
  now: number,
): Promise<number> {
  const oldest = await env.DB.prepare(sql)
    .bind(...binds)
    .first<{ created_at: string }>();
  if (!oldest) {
    return Math.ceil(OTP_SEND_WINDOW_MS / 1000);
  }
  const ageOutAt = new Date(oldest.created_at).getTime() + OTP_SEND_WINDOW_MS;
  return Math.max(1, Math.ceil((ageOutAt - now) / 1000));
}

export type LoginLockoutCheck =
  | { locked: false }
  | { locked: true; retryAfterSeconds: number };

async function readLockRow(
  env: Env,
  scope: "login_account" | "login_ip",
  subject: string,
): Promise<{
  fail_count: number;
  first_failed_at: string | null;
  locked_until: string | null;
} | null> {
  return env.DB.prepare(
    `SELECT fail_count, first_failed_at, locked_until FROM auth_rate_limits
     WHERE scope = ? AND subject = ?`,
  )
    .bind(scope, subject)
    .first();
}

/** Checks whether login is currently locked out for this account or IP. */
export async function checkLoginLockout(
  env: Env,
  scope: "login_account" | "login_ip",
  subject: string,
): Promise<LoginLockoutCheck> {
  const row = await readLockRow(env, scope, subject);
  if (!row?.locked_until) {
    return { locked: false };
  }
  const remainingMs = new Date(row.locked_until).getTime() - Date.now();
  if (remainingMs <= 0) {
    return { locked: false };
  }
  return { locked: true, retryAfterSeconds: Math.ceil(remainingMs / 1000) };
}

/**
 * Records a failed login for the given scope/subject (account or IP), locking
 * it out once `LOGIN_MAX_ATTEMPTS` failures land within the rolling window.
 * Both `login_account` and `login_ip` scopes must be recorded per attempt —
 * the plan requires both lockout dimensions, not just one.
 */
export async function recordLoginFailure(
  env: Env,
  scope: "login_account" | "login_ip",
  subject: string,
): Promise<LoginLockoutCheck> {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const row = await readLockRow(env, scope, subject);

  const windowExpired =
    !row?.first_failed_at ||
    now - new Date(row.first_failed_at).getTime() > LOGIN_LOCKOUT_WINDOW_MS;

  const nextCount = windowExpired ? 1 : row!.fail_count + 1;
  const firstFailedAt = windowExpired ? nowIso : row!.first_failed_at;
  const lockedUntil =
    nextCount >= LOGIN_MAX_ATTEMPTS
      ? new Date(now + LOGIN_LOCKOUT_DURATION_MS).toISOString()
      : null;

  await env.DB.prepare(
    `INSERT INTO auth_rate_limits (scope, subject, fail_count, first_failed_at, locked_until, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(scope, subject) DO UPDATE SET
       fail_count = excluded.fail_count,
       first_failed_at = excluded.first_failed_at,
       locked_until = excluded.locked_until,
       updated_at = excluded.updated_at`,
  )
    .bind(scope, subject, nextCount, firstFailedAt, lockedUntil, nowIso)
    .run();

  if (lockedUntil) {
    return {
      locked: true,
      retryAfterSeconds: Math.ceil(LOGIN_LOCKOUT_DURATION_MS / 1000),
    };
  }
  return { locked: false };
}

/** Resets failure counters on successful login. */
export async function clearLoginFailures(
  env: Env,
  scope: "login_account" | "login_ip",
  subject: string,
): Promise<void> {
  await env.DB.prepare(
    `DELETE FROM auth_rate_limits WHERE scope = ? AND subject = ?`,
  )
    .bind(scope, subject)
    .run();
}
