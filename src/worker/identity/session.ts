import type { Env } from "../env";
import { hmacHex, randomToken } from "./crypto";

export const SESSION_COOKIE_NAME = "squad_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30-day absolute TTL, no sliding renewal.
const TOKEN_BYTES = 32;

export type SessionRow = {
  id: string;
  account_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  last_seen_at: string;
  revoked_at: string | null;
  ip_hash: string | null;
  user_agent: string | null;
};

export type AccountRow = {
  id: string;
  phone_e164: string;
  password_hash: string;
  phone_verified_at: string;
  email: string | null;
  profile_prompt_dismissed_at: string | null;
  disciplines_prompt_dismissed_at: string | null;
  email_prompt_dismissed_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AuthContext = {
  session: SessionRow;
  account: AccountRow;
};

/** Public account fields returned by auth endpoints (no password hash / dismiss stamps). */
export function accountView(account: AccountRow) {
  return {
    id: account.id,
    phoneE164: account.phone_e164,
    phoneVerifiedAt: account.phone_verified_at,
    email: account.email,
  };
}

/** Peppered hash of the opaque session token — the only form ever stored in D1. */
export function hashSessionToken(
  token: string,
  signingKey: string,
): Promise<string> {
  return hmacHex(signingKey, `session:${token}`);
}

/** Hashes an IP address for storage/rate-limit keys without keeping raw IPs. */
export function hashIp(ip: string, signingKey: string): Promise<string> {
  return hmacHex(signingKey, `ip:${ip}`);
}

function generateToken(): string {
  return randomToken(TOKEN_BYTES);
}

export function getClientIp(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? "unknown";
}

/** Masks a phone number for logs: keeps country code + last 2 digits. */
export function maskPhone(phoneE164: string): string {
  if (phoneE164.length <= 6) {
    return "***";
  }
  return `${phoneE164.slice(0, 4)}***${phoneE164.slice(-2)}`;
}

export type CreatedSession = {
  token: string;
  sessionId: string;
  expiresAt: string;
};

export async function createSession(
  env: Env,
  accountId: string,
  request: Request,
): Promise<CreatedSession> {
  const token = generateToken();
  const tokenHash = await hashSessionToken(token, env.SESSION_SIGNING_KEY);
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
  const ipHash = await hashIp(getClientIp(request), env.SESSION_SIGNING_KEY);
  const userAgent = request.headers.get("User-Agent")?.slice(0, 256) ?? null;

  await env.DB.prepare(
    `INSERT INTO sessions (id, account_id, token_hash, expires_at, ip_hash, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(sessionId, accountId, tokenHash, expiresAt, ipHash, userAgent)
    .run();

  return { token, sessionId, expiresAt };
}

export function readSessionCookie(request: Request): string | null {
  const header = request.headers.get("Cookie");
  if (!header) {
    return null;
  }
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === SESSION_COOKIE_NAME) {
      return rest.join("=");
    }
  }
  return null;
}

function cookieAttributes(env: Env, maxAgeSeconds: number): string {
  // Secure cookies are dropped by browsers on plain http://localhost; only the
  // local dev environment relaxes this. Dev/production are always HTTPS.
  const secure = env.ENVIRONMENT === "local" ? "" : " Secure;";
  return `Path=/; HttpOnly;${secure} SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export function buildSessionCookie(
  env: Env,
  token: string,
  expiresAt: string,
): string {
  const maxAgeSeconds = Math.max(
    0,
    Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
  );
  return `${SESSION_COOKIE_NAME}=${token}; ${cookieAttributes(env, maxAgeSeconds)}`;
}

export function buildClearSessionCookie(env: Env): string {
  return `${SESSION_COOKIE_NAME}=; ${cookieAttributes(env, 0)}`;
}

/** Loads the session + account for a request's cookie, if valid and not expired/revoked. */
export async function loadAuthContext(
  env: Env,
  request: Request,
): Promise<AuthContext | null> {
  const token = readSessionCookie(request);
  if (!token) {
    return null;
  }
  const tokenHash = await hashSessionToken(token, env.SESSION_SIGNING_KEY);
  const session = await env.DB.prepare(
    `SELECT * FROM sessions WHERE token_hash = ?`,
  )
    .bind(tokenHash)
    .first<SessionRow>();
  if (!session || session.revoked_at) {
    return null;
  }
  if (new Date(session.expires_at).getTime() <= Date.now()) {
    return null;
  }
  const account = await env.DB.prepare(
    `SELECT * FROM accounts WHERE id = ? AND deleted_at IS NULL`,
  )
    .bind(session.account_id)
    .first<AccountRow>();
  if (!account) {
    return null;
  }

  // Best-effort touch; failures here must never block the request.
  try {
    await env.DB.prepare(`UPDATE sessions SET last_seen_at = ? WHERE id = ?`)
      .bind(new Date().toISOString(), session.id)
      .run();
  } catch {
    // ignore — last_seen_at is diagnostic only
  }

  return { session, account };
}

export async function revokeSessionById(
  env: Env,
  sessionId: string,
): Promise<void> {
  await env.DB.prepare(
    `UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL`,
  )
    .bind(new Date().toISOString(), sessionId)
    .run();
}

/** Revokes every other active session for the account — used by reset/phone-change. */
export async function revokeAllOtherSessions(
  env: Env,
  accountId: string,
  currentSessionId: string | null,
): Promise<void> {
  await env.DB.prepare(
    `UPDATE sessions
     SET revoked_at = ?
     WHERE account_id = ?
       AND revoked_at IS NULL
       AND id != ?`,
  )
    .bind(new Date().toISOString(), accountId, currentSessionId ?? "")
    .run();
}

export async function sweepExpiredSessions(env: Env): Promise<number> {
  const result = await env.DB.prepare(
    `DELETE FROM sessions WHERE expires_at < ?`,
  )
    .bind(new Date().toISOString())
    .run();
  return result.meta.changes ?? 0;
}
