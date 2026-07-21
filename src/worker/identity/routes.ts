import type { Env } from "../env";
import { isValidEmailShape, isValidNickname, NICKNAME_MAX_LENGTH } from "../../shared/profileValidation";
import {
  AUTH_ERROR_STATUS,
  authError,
  errorResponse,
  isOriginAllowed,
  json,
  readJsonBody,
  requireAuth,
} from "./authHttp";
import {
  computeOnboardingStep,
  dismissPrompt,
  loadProfileOnboardingRow,
  type OnboardingStep,
} from "./onboarding";
import { sha256Hex } from "./crypto";
import { hashPassword, verifyPassword, assertPasswordLength, PasswordLengthError } from "./password";
import { InvalidPhoneError, normalizePhoneToE164 } from "./phone";
import { type ProfileInput } from "./profile";
import { getProfileRow, upsertNicknameOnly, upsertProfileFromInput } from "./profileStore";
import {
  consumePhoneProof,
  startOtpChallenge,
  verifyOtpChallenge,
  type OtpPurpose,
} from "./otp";
import {
  checkLoginLockout,
  clearLoginFailures,
  recordLoginFailure,
} from "./rate-limit";
import {
  accountView,
  buildClearSessionCookie,
  buildSessionCookie,
  createSession,
  getClientIp,
  hashIp,
  maskPhone,
  revokeAllOtherSessions,
  revokeSessionById,
  type AccountRow,
  type CreatedSession,
} from "./session";
import { getTurnstileVerifier, TurnstileMisconfiguredError } from "./turnstile";
import { profileView } from "./profile";

export type { OnboardingStep };

const OTP_PURPOSES: readonly OtpPurpose[] = [
  "register",
  "password_reset",
  "change_phone",
];

function isOtpPurpose(value: unknown): value is OtpPurpose {
  return typeof value === "string" && (OTP_PURPOSES as readonly string[]).includes(value);
}

let dummyHashPromise: Promise<string> | null = null;
/** Constant work for the "account not found" path so login timing doesn't leak existence. */
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword("dummy-password-for-timing-parity-only");
  }
  return dummyHashPromise;
}

async function handleOtpStart(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody<{
    phone?: string;
    purpose?: string;
    turnstileToken?: string;
  }>(request);
  if (!body || !isOtpPurpose(body.purpose) || typeof body.phone !== "string") {
    return errorResponse("invalid_request", 400);
  }

  if (body.purpose === "change_phone") {
    const gated = await requireAuth(request, env);
    if (!gated.ok) return gated.response;
  }

  let phoneE164: string;
  try {
    phoneE164 = normalizePhoneToE164(body.phone);
  } catch (err) {
    if (err instanceof InvalidPhoneError) {
      return errorResponse("invalid_phone", 400);
    }
    throw err;
  }

  const clientIp = getClientIp(request);
  let turnstileOk: boolean;
  try {
    const turnstile = getTurnstileVerifier(env);
    turnstileOk = await turnstile.verify(body.turnstileToken ?? null, clientIp);
  } catch (err) {
    if (err instanceof TurnstileMisconfiguredError) {
      console.error("[auth] otp/start refused: TURNSTILE_SECRET_KEY missing in live OTP mode");
      return authError("turnstile_misconfigured");
    }
    throw err;
  }
  if (!turnstileOk) {
    return authError("turnstile_failed");
  }

  const ipHash = await hashIp(clientIp, env.SESSION_SIGNING_KEY);
  const result = await startOtpChallenge(env, {
    phoneE164,
    purpose: body.purpose,
    ipHash,
  });

  if (!result.ok) {
    console.log(
      `[auth] otp/start rate_limited phone=${maskPhone(phoneE164)} purpose=${body.purpose} reason=${result.reason}`,
    );
    return authError(
      "rate_limited",
      { reason: result.reason },
      { "Retry-After": String(result.retryAfterSeconds) },
    );
  }

  return json({
    challengeId: result.challengeId,
    expiresAt: result.expiresAt,
    resendAfterSeconds: result.resendAfterSeconds,
  });
}

async function handleOtpVerify(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody<{
    phone?: string;
    purpose?: string;
    code?: string;
  }>(request);
  if (
    !body ||
    !isOtpPurpose(body.purpose) ||
    typeof body.phone !== "string" ||
    typeof body.code !== "string"
  ) {
    return errorResponse("invalid_request", 400);
  }

  let phoneE164: string;
  try {
    phoneE164 = normalizePhoneToE164(body.phone);
  } catch {
    return errorResponse("invalid_phone", 400);
  }

  const result = await verifyOtpChallenge(env, {
    phoneE164,
    purpose: body.purpose,
    code: body.code,
  });

  if (!result.ok) {
    const status =
      result.error in AUTH_ERROR_STATUS
        ? AUTH_ERROR_STATUS[result.error as keyof typeof AUTH_ERROR_STATUS]
        : 400;
    console.log(
      `[auth] otp/verify failed phone=${maskPhone(phoneE164)} purpose=${body.purpose} error=${result.error}`,
    );
    return errorResponse(result.error, status);
  }

  // Post-OTP accountMode mirrors register ↔ forgot: same phone ownership proof,
  // different UI handoff. Reveals existence only after successful OTP (same as
  // register-as-reset). Forgot + unknown phone remints the proof to `register`
  // so the client can finish on /register without a second OTP.
  let accountMode: "created" | "password_reset" | undefined;
  if (body.purpose === "register" || body.purpose === "password_reset") {
    const existing = await env.DB.prepare(
      `SELECT 1 AS present FROM accounts WHERE phone_e164 = ? AND deleted_at IS NULL`,
    )
      .bind(phoneE164)
      .first<{ present: number }>();
    accountMode = existing ? "password_reset" : "created";

    if (body.purpose === "password_reset" && accountMode === "created") {
      const proofHash = await sha256Hex(`proof:${result.proofToken}`);
      await env.DB.prepare(
        `UPDATE phone_proofs
         SET purpose = 'register'
         WHERE proof_hash = ? AND purpose = 'password_reset' AND consumed_at IS NULL`,
      )
        .bind(proofHash)
        .run();
    }
  }

  return json({
    proofToken: result.proofToken,
    expiresAt: result.expiresAt,
    ...(accountMode ? { accountMode } : {}),
  });
}

function parseRegisterNickname(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > NICKNAME_MAX_LENGTH || !isValidNickname(trimmed)) {
    return null;
  }
  return trimmed;
}

async function handleRegister(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody<{
    proofToken?: string;
    password?: string;
    nickname?: string;
  }>(request);
  if (!body || typeof body.proofToken !== "string" || typeof body.password !== "string") {
    return errorResponse("invalid_request", 400);
  }

  const nickname = parseRegisterNickname(body.nickname);
  if (!nickname) {
    return errorResponse("invalid_profile", 400, { field: "nickname" });
  }

  try {
    assertPasswordLength(body.password);
  } catch (err) {
    if (err instanceof PasswordLengthError) {
      return errorResponse("invalid_password", 400);
    }
    throw err;
  }

  // Register-purpose proof is phone-ownership authority — same strength as
  // password_reset. If the phone already has an account, set a new password
  // and sign them in instead of failing with phone_already_registered.
  const proof = await consumePhoneProof(env, body.proofToken, "register");
  if (!proof) {
    return errorResponse("invalid_or_expired_proof", 400);
  }

  const passwordHash = await hashPassword(body.password);
  const now = new Date().toISOString();
  const accountId = crypto.randomUUID();

  try {
    await env.DB.prepare(
      `INSERT INTO accounts (id, phone_e164, password_hash, phone_verified_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(accountId, proof.phoneE164, passwordHash, now, now, now)
      .run();
  } catch (err) {
    // Atomic insert relies on UNIQUE(phone_e164) — never check-then-insert.
    // On conflict: OTP proof already consumed → treat as authorized password set.
    if (!isUniqueConstraintError(err)) {
      throw err;
    }
    const updated = await applyProofAuthorizedPassword(env, request, {
      phoneE164: proof.phoneE164,
      passwordHash,
      now,
    });
    if (!updated) {
      return errorResponse("invalid_or_expired_proof", 400);
    }
    const nickResult = await upsertNicknameOnly(env, updated.account.id, nickname);
    if (!nickResult.ok) {
      return errorResponse("invalid_profile", 400, { field: nickResult.field ?? "nickname" });
    }
    console.log(`[auth] register-as-reset phone=${maskPhone(proof.phoneE164)}`);
    return json(
      {
        account: {
          ...accountView(updated.account),
          phoneVerifiedAt: now,
        },
        accountMode: "password_reset",
      },
      200,
      {
        "Set-Cookie": buildSessionCookie(env, updated.session.token, updated.session.expiresAt),
      },
    );
  }

  const nickResult = await upsertNicknameOnly(env, accountId, nickname);
  if (!nickResult.ok) {
    return errorResponse("invalid_profile", 400, { field: nickResult.field ?? "nickname" });
  }

  const session = await createSession(env, accountId, request);
  return json(
    {
      account: {
        id: accountId,
        phoneE164: proof.phoneE164,
        phoneVerifiedAt: now,
        email: null,
      },
      accountMode: "created",
    },
    201,
    { "Set-Cookie": buildSessionCookie(env, session.token, session.expiresAt) },
  );
}

/**
 * Proof-authorized password set for an existing account (register collision
 * or password_reset). Creates a fresh session and revokes every other session.
 */
async function applyProofAuthorizedPassword(
  env: Env,
  request: Request,
  args: { phoneE164: string; passwordHash: string; now: string },
): Promise<{ account: AccountRow; session: CreatedSession } | null> {
  const account = await env.DB.prepare(
    `SELECT * FROM accounts WHERE phone_e164 = ? AND deleted_at IS NULL`,
  )
    .bind(args.phoneE164)
    .first<AccountRow>();
  if (!account) {
    return null;
  }

  await env.DB.prepare(
    `UPDATE accounts
     SET password_hash = ?, phone_verified_at = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(args.passwordHash, args.now, args.now, account.id)
    .run();

  const session = await createSession(env, account.id, request);
  await revokeAllOtherSessions(env, account.id, session.sessionId);
  await clearLoginFailures(env, "login_account", account.id);
  return { account, session };
}

function isUniqueConstraintError(err: unknown): boolean {
  return err instanceof Error && /UNIQUE constraint failed/i.test(err.message);
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody<{ phone?: string; password?: string }>(request);
  if (!body || typeof body.phone !== "string" || typeof body.password !== "string") {
    return errorResponse("invalid_request", 400);
  }

  let phoneE164: string;
  try {
    phoneE164 = normalizePhoneToE164(body.phone);
  } catch {
    return errorResponse("invalid_credentials", 401);
  }

  const clientIp = getClientIp(request);
  const ipHash = await hashIp(clientIp, env.SESSION_SIGNING_KEY);

  const ipLock = await checkLoginLockout(env, "login_ip", ipHash);
  if (ipLock.locked) {
    return authError("rate_limited", undefined, {
      "Retry-After": String(ipLock.retryAfterSeconds),
    });
  }

  const account = await env.DB.prepare(
    `SELECT * FROM accounts WHERE phone_e164 = ? AND deleted_at IS NULL`,
  )
    .bind(phoneE164)
    .first<AccountRow>();

  if (!account) {
    await verifyPassword(body.password, await getDummyHash());
    await recordLoginFailure(env, "login_ip", ipHash);
    return errorResponse("invalid_credentials", 401);
  }

  const accountLock = await checkLoginLockout(env, "login_account", account.id);
  if (accountLock.locked) {
    return authError("rate_limited", undefined, {
      "Retry-After": String(accountLock.retryAfterSeconds),
    });
  }

  const passwordOk = await verifyPassword(body.password, account.password_hash);
  if (!passwordOk) {
    await Promise.all([
      recordLoginFailure(env, "login_ip", ipHash),
      recordLoginFailure(env, "login_account", account.id),
    ]);
    console.log(`[auth] login failed phone=${maskPhone(phoneE164)}`);
    return errorResponse("invalid_credentials", 401);
  }

  await Promise.all([
    clearLoginFailures(env, "login_ip", ipHash),
    clearLoginFailures(env, "login_account", account.id),
  ]);

  const session = await createSession(env, account.id, request);
  return json(
    { account: accountView(account) },
    200,
    { "Set-Cookie": buildSessionCookie(env, session.token, session.expiresAt) },
  );
}

async function handleLogout(request: Request, env: Env): Promise<Response> {
  const gated = await requireAuth(request, env);
  if (gated.ok) {
    await revokeSessionById(env, gated.auth.session.id);
  }
  return json({ ok: true }, 200, { "Set-Cookie": buildClearSessionCookie(env) });
}

async function handleMe(request: Request, env: Env): Promise<Response> {
  const gated = await requireAuth(request, env, { clearCookieOnMiss: true });
  if (!gated.ok) return gated.response;

  // Single narrow query, not N+1: post-auth onboarding is driven by DB
  // state (survives refresh), not in-memory wizard state. Priority
  // profile → disciplines → email → null — see computeOnboardingStep.
  const profile = await loadProfileOnboardingRow(env, gated.auth.account.id);
  const onboardingStep = computeOnboardingStep(gated.auth.account, profile);
  // Backward-compatible alias: true only while the profile step is next.
  const showProfilePrompt = onboardingStep === "profile";
  return json({
    account: accountView(gated.auth.account),
    onboardingStep,
    showProfilePrompt,
  });
}

async function handlePasswordReset(request: Request, env: Env): Promise<Response> {
  const body = await readJsonBody<{ proofToken?: string; newPassword?: string }>(request);
  if (!body || typeof body.proofToken !== "string" || typeof body.newPassword !== "string") {
    return errorResponse("invalid_request", 400);
  }

  try {
    assertPasswordLength(body.newPassword);
  } catch (err) {
    if (err instanceof PasswordLengthError) {
      return errorResponse("invalid_password", 400);
    }
    throw err;
  }

  const proof = await consumePhoneProof(env, body.proofToken, "password_reset");
  if (!proof) {
    return errorResponse("invalid_or_expired_proof", 400);
  }

  const passwordHash = await hashPassword(body.newPassword);
  const now = new Date().toISOString();
  const updated = await applyProofAuthorizedPassword(env, request, {
    phoneE164: proof.phoneE164,
    passwordHash,
    now,
  });
  if (!updated) {
    // No account for this phone — same generic error as a bad proof (no enumeration).
    return errorResponse("invalid_or_expired_proof", 400);
  }

  return json(
    { ok: true },
    200,
    {
      "Set-Cookie": buildSessionCookie(env, updated.session.token, updated.session.expiresAt),
    },
  );
}

async function handlePhoneChange(request: Request, env: Env): Promise<Response> {
  const gated = await requireAuth(request, env);
  if (!gated.ok) return gated.response;

  const body = await readJsonBody<{ proofToken?: string }>(request);
  if (!body || typeof body.proofToken !== "string") {
    return errorResponse("invalid_request", 400);
  }

  // Set phone_proofs.account_id on consume when the authenticated account is known.
  const proof = await consumePhoneProof(env, body.proofToken, "change_phone", {
    accountId: gated.auth.account.id,
  });
  if (!proof) {
    return errorResponse("invalid_or_expired_proof", 400);
  }

  try {
    await env.DB.prepare(
      `UPDATE accounts SET phone_e164 = ?, phone_verified_at = ?, updated_at = ? WHERE id = ?`,
    )
      .bind(proof.phoneE164, new Date().toISOString(), new Date().toISOString(), gated.auth.account.id)
      .run();
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      return errorResponse("phone_already_registered", 409);
    }
    throw err;
  }

  // Hard rule: phone change must revoke every other active session for the account.
  await revokeAllOtherSessions(env, gated.auth.account.id, gated.auth.session.id);

  return json({ ok: true, phoneE164: proof.phoneE164 });
}

async function handleProfileGet(request: Request, env: Env): Promise<Response> {
  const gated = await requireAuth(request, env);
  if (!gated.ok) return gated.response;
  const profile = await getProfileRow(env, gated.auth.account.id);
  if (!profile) {
    return errorResponse("not_found", 404);
  }
  return json({ profile: profileView(profile) });
}

async function handleProfileUpsert(request: Request, env: Env): Promise<Response> {
  const gated = await requireAuth(request, env);
  if (!gated.ok) return gated.response;

  const body = await readJsonBody<ProfileInput>(request);
  if (!body) {
    return errorResponse("invalid_request", 400);
  }

  const result = await upsertProfileFromInput(env, gated.auth.account.id, body);
  if (!result.ok) {
    if (result.error === "invalid_profile") {
      return errorResponse("invalid_profile", 400, { field: result.field });
    }
    return errorResponse("invalid_request", 400);
  }
  return json({ profile: result.profile });
}

/** Idempotent: calling twice is fine, doesn't error on an already-dismissed prompt. */
async function handleDismissProfilePrompt(request: Request, env: Env): Promise<Response> {
  const gated = await requireAuth(request, env);
  if (!gated.ok) return gated.response;
  await dismissPrompt(env, gated.auth.account.id, "profile_prompt_dismissed_at");
  return json({ ok: true });
}

/** Idempotent: calling twice is fine, doesn't error on an already-dismissed prompt. */
async function handleDismissEmailPrompt(request: Request, env: Env): Promise<Response> {
  const gated = await requireAuth(request, env);
  if (!gated.ok) return gated.response;
  await dismissPrompt(env, gated.auth.account.id, "email_prompt_dismissed_at");
  return json({ ok: true });
}

/** Idempotent: calling twice is fine, doesn't error on an already-dismissed prompt. */
async function handleDismissDisciplinesPrompt(request: Request, env: Env): Promise<Response> {
  const gated = await requireAuth(request, env);
  if (!gated.ok) return gated.response;
  await dismissPrompt(env, gated.auth.account.id, "disciplines_prompt_dismissed_at");
  return json({ ok: true });
}

async function handleAccountEmail(request: Request, env: Env): Promise<Response> {
  const gated = await requireAuth(request, env);
  if (!gated.ok) return gated.response;

  const body = await readJsonBody<{ email?: string }>(request);
  if (!body || typeof body.email !== "string") {
    return errorResponse("invalid_request", 400);
  }

  const email = body.email.trim().toLowerCase();
  if (!isValidEmailShape(email)) {
    return errorResponse("invalid_email", 400);
  }

  try {
    await env.DB.prepare(`UPDATE accounts SET email = ?, updated_at = ? WHERE id = ?`)
      .bind(email, new Date().toISOString(), gated.auth.account.id)
      .run();
  } catch (err) {
    // UPDATE also enforces UNIQUE(email) atomically — same no-check-then-insert
    // / no-enumeration spirit as the register-phone-conflict handling above.
    if (isUniqueConstraintError(err)) {
      return errorResponse("email_already_used", 409);
    }
    throw err;
  }

  return json({ ok: true, email });
}

/**
 * Removes every live authentication/contact channel while preserving opaque
 * Account/Profile tombstones. Match registrations point at Profile and may
 * retain Account actor/creator references, so neither identity row is hard
 * deleted or cascaded. D1 batch is atomic: a failed statement applies none.
 */
async function handleAccountDelete(request: Request, env: Env): Promise<Response> {
  const gated = await requireAuth(request, env);
  if (!gated.ok) return gated.response;

  const now = new Date().toISOString();
  const deletedLogin = `deleted:${crypto.randomUUID()}`;
  const disabledPassword = `deleted:${crypto.randomUUID()}`;
  const deletedChallengePhone = `deleted:${crypto.randomUUID()}`;
  const accountId = gated.auth.account.id;
  const phone = gated.auth.account.phone_e164;

  await env.DB.batch([
    env.DB.prepare(
      `DELETE FROM auth_rate_limits
       WHERE (scope = 'login_account' AND subject = ?)
          OR (scope = 'login_ip' AND subject IN (
            SELECT ip_hash FROM sessions WHERE account_id = ? AND ip_hash IS NOT NULL
          ))`,
    ).bind(accountId, accountId),
    env.DB.prepare(
      `UPDATE auth_challenges
       SET phone_e164 = ?
       WHERE phone_e164 = ?
          OR id IN (SELECT challenge_id FROM phone_proofs WHERE account_id = ?)`,
    ).bind(deletedChallengePhone, phone, accountId),
    env.DB.prepare(
      `DELETE FROM phone_proofs WHERE account_id = ? OR phone_e164 = ?`,
    ).bind(accountId, phone),
    env.DB.prepare(`DELETE FROM auth_challenges WHERE phone_e164 = ?`).bind(
      deletedChallengePhone,
    ),
    env.DB.prepare(`DELETE FROM push_subscriptions WHERE account_id = ?`).bind(accountId),
    env.DB.prepare(`DELETE FROM account_telegram_links WHERE account_id = ?`).bind(accountId),
    env.DB.prepare(`DELETE FROM sessions WHERE account_id = ?`).bind(accountId),
    env.DB.prepare(
      `UPDATE profiles
       SET first_name_ua = NULL, last_name_ua = NULL,
           first_name_en = NULL, last_name_en = NULL,
           nickname = NULL, gender = NULL, birth_date = NULL,
           upsf_member = 0, region = NULL, city = NULL, club = NULL,
           ipsc_member = 0, ipsc_member_number = NULL, ipsc_region = NULL,
           pistol_enabled = 0, pistol_division = NULL, pistol_power_factor = NULL,
           carbine_enabled = 0, carbine_division = NULL, carbine_power_factor = NULL,
           pcc_mini_rifle_enabled = 0, pcc_mini_rifle_division = NULL,
           pcc_mini_rifle_power_factor = NULL,
           shotgun_enabled = 0, shotgun_division = NULL, shotgun_power_factor = NULL,
           profile_completed_at = NULL, deleted_at = ?, updated_at = ?
       WHERE account_id = ?`,
    ).bind(now, now, accountId),
    env.DB.prepare(
      `UPDATE accounts
       SET phone_e164 = ?, password_hash = ?, phone_verified_at = ?,
           email = NULL, profile_prompt_dismissed_at = NULL,
           disciplines_prompt_dismissed_at = NULL,
           email_prompt_dismissed_at = NULL, deleted_at = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL`,
    ).bind(deletedLogin, disabledPassword, now, now, now, accountId),
  ]);

  return json({ ok: true }, 200, { "Set-Cookie": buildClearSessionCookie(env) });
}

/** Public, client-safe auth configuration. Secret keys are never exposed. */
async function handleAuthConfig(_request: Request, env: Env): Promise<Response> {
  return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY?.trim() || null });
}

type RouteHandler = (request: Request, env: Env) => Promise<Response>;

const ROUTES: Record<string, Record<string, RouteHandler>> = {
  "/api/auth/config": { GET: handleAuthConfig },
  "/api/auth/phone/otp/start": { POST: handleOtpStart },
  "/api/auth/phone/otp/verify": { POST: handleOtpVerify },
  "/api/auth/register": { POST: handleRegister },
  "/api/auth/login": { POST: handleLogin },
  "/api/auth/logout": { POST: handleLogout },
  "/api/auth/me": { GET: handleMe },
  "/api/auth/password/reset": { POST: handlePasswordReset },
  "/api/auth/phone/change": { POST: handlePhoneChange },
  "/api/auth/account/email": { POST: handleAccountEmail },
  "/api/auth/account": { DELETE: handleAccountDelete },
  "/api/auth/account/profile-prompt/dismiss": { POST: handleDismissProfilePrompt },
  "/api/auth/account/disciplines-prompt/dismiss": { POST: handleDismissDisciplinesPrompt },
  "/api/auth/account/email-prompt/dismiss": { POST: handleDismissEmailPrompt },
  "/api/profile": { GET: handleProfileGet, POST: handleProfileUpsert },
};

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Returns `null` when the path isn't an identity route, so the caller can fall through. */
export async function routeIdentityRequest(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response | null> {
  const methods = ROUTES[pathname];
  if (!methods) {
    return null;
  }
  const handler = methods[request.method];
  if (!handler) {
    return authError("method_not_allowed");
  }
  if (STATE_CHANGING_METHODS.has(request.method) && !isOriginAllowed(request, env)) {
    return authError("origin_not_allowed");
  }
  return handler(request, env);
}
