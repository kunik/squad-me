import type { Env } from "../../env";
import {
  checkOtpSendAllowed,
  OTP_MAX_VERIFY_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
} from "../rate-limit";
import { randomNumericCode, randomToken, sha256Hex, constantTimeEqual } from "../crypto";
import { FakeOtpProvider } from "./fake";
import { GatewayOtpProvider } from "./gateway";
import { TwilioOtpProvider } from "./twilio";
import type { OtpProvider } from "./types";

export type OtpPurpose = "register" | "password_reset" | "change_phone";

export const OTP_CHALLENGE_TTL_MS = 10 * 60 * 1000;
export const PHONE_PROOF_TTL_MS = 10 * 60 * 1000;
const OTP_CODE_DIGITS = 6;
const OTP_RESEND_AFTER_SECONDS = Math.ceil(OTP_RESEND_COOLDOWN_MS / 1000);

/**
 * Selects the OTP channel. `OTP_SINK_MODE=log` (mandatory for tests/local
 * dev, per the plan) always wins — real Gateway/Twilio calls must never
 * happen outside a real deploy. Otherwise: Telegram Gateway first, Twilio
 * Verify as fallback when Gateway has no token configured.
 */
export function selectOtpProvider(env: Env): OtpProvider {
  if (env.OTP_SINK_MODE === "log") {
    return new FakeOtpProvider();
  }
  if (env.TELEGRAM_GATEWAY_TOKEN) {
    return new GatewayOtpProvider(env.TELEGRAM_GATEWAY_TOKEN);
  }
  if (
    env.TWILIO_ACCOUNT_SID &&
    env.TWILIO_AUTH_TOKEN &&
    env.TWILIO_VERIFY_SERVICE_SID
  ) {
    return new TwilioOtpProvider(
      env.TWILIO_ACCOUNT_SID,
      env.TWILIO_AUTH_TOKEN,
      env.TWILIO_VERIFY_SERVICE_SID,
    );
  }
  // No provider configured and not in sink mode — fail loud rather than
  // silently no-op sending a code nobody receives.
  throw new Error("no OTP provider configured (set OTP_SINK_MODE=log for dev/test)");
}

export type OtpStartResult =
  | { ok: true; challengeId: string; expiresAt: string; resendAfterSeconds: number }
  | {
      ok: false;
      error: "rate_limited";
      reason: "cooldown" | "phone_limit" | "ip_limit";
      retryAfterSeconds: number;
    };

export async function startOtpChallenge(
  env: Env,
  params: { phoneE164: string; purpose: OtpPurpose; ipHash: string },
): Promise<OtpStartResult> {
  const check = await checkOtpSendAllowed(
    env,
    params.phoneE164,
    params.purpose,
    params.ipHash,
  );
  if (!check.allowed) {
    // Refresh / re-enter-phone within the cooldown: reuse the pending
    // challenge instead of returning rate_limited (no new SMS).
    if (check.reason === "cooldown") {
      const reused = await reusePendingChallenge(
        env,
        params.phoneE164,
        params.purpose,
        check.retryAfterSeconds,
      );
      if (reused) {
        return reused;
      }
    }
    return {
      ok: false,
      error: "rate_limited",
      reason: check.reason,
      retryAfterSeconds: check.retryAfterSeconds,
    };
  }

  const code = randomNumericCode(OTP_CODE_DIGITS);
  const codeHash = await sha256Hex(code);
  const provider = selectOtpProvider(env);
  const { providerRef } = await provider.send(params.phoneE164, code);

  const challengeId = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = new Date(now + OTP_CHALLENGE_TTL_MS).toISOString();

  await env.DB.prepare(
    `INSERT INTO auth_challenges
       (id, phone_e164, purpose, code_hash, ip_hash, provider, provider_ref, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      challengeId,
      params.phoneE164,
      params.purpose,
      codeHash,
      params.ipHash,
      provider.name,
      providerRef,
      expiresAt,
    )
    .run();

  return {
    ok: true,
    challengeId,
    expiresAt,
    resendAfterSeconds: OTP_RESEND_AFTER_SECONDS,
  };
}

/**
 * When otp/start would hit the resend cooldown, return the still-pending
 * challenge so a browser refresh does not surface "too many attempts".
 */
async function reusePendingChallenge(
  env: Env,
  phoneE164: string,
  purpose: OtpPurpose,
  resendAfterSeconds: number,
): Promise<Extract<OtpStartResult, { ok: true }> | null> {
  const row = await env.DB.prepare(
    `SELECT id, status, expires_at FROM auth_challenges
     WHERE phone_e164 = ? AND purpose = ?
     ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(phoneE164, purpose)
    .first<{ id: string; status: string; expires_at: string }>();

  if (!row || row.status !== "pending") {
    return null;
  }
  if (new Date(row.expires_at).getTime() <= Date.now()) {
    return null;
  }

  return {
    ok: true,
    challengeId: row.id,
    expiresAt: row.expires_at,
    resendAfterSeconds,
  };
}

export type OtpVerifyResult =
  | { ok: true; proofToken: string; expiresAt: string }
  | { ok: false; error: "no_challenge" | "invalid_code" | "locked" | "expired" };

type ChallengeRow = {
  id: string;
  code_hash: string;
  attempt_count: number;
  status: string;
  expires_at: string;
};

export async function verifyOtpChallenge(
  env: Env,
  params: { phoneE164: string; purpose: OtpPurpose; code: string },
): Promise<OtpVerifyResult> {
  const challenge = await env.DB.prepare(
    `SELECT id, code_hash, attempt_count, status, expires_at FROM auth_challenges
     WHERE phone_e164 = ? AND purpose = ?
     ORDER BY created_at DESC LIMIT 1`,
  )
    .bind(params.phoneE164, params.purpose)
    .first<ChallengeRow>();

  if (!challenge) {
    return { ok: false, error: "no_challenge" };
  }
  if (challenge.status === "locked") {
    return { ok: false, error: "locked" };
  }
  if (challenge.status === "verified") {
    // Already consumed into a proof; caller must start a new challenge.
    return { ok: false, error: "no_challenge" };
  }
  if (new Date(challenge.expires_at).getTime() <= Date.now()) {
    await env.DB.prepare(`UPDATE auth_challenges SET status = 'expired' WHERE id = ?`)
      .bind(challenge.id)
      .run();
    return { ok: false, error: "expired" };
  }

  const candidateHash = await sha256Hex(params.code);
  const matches = constantTimeEqual(candidateHash, challenge.code_hash);

  if (!matches) {
    const nextAttempts = challenge.attempt_count + 1;
    const locked = nextAttempts >= OTP_MAX_VERIFY_ATTEMPTS;
    await env.DB.prepare(
      `UPDATE auth_challenges SET attempt_count = ?, status = ? WHERE id = ?`,
    )
      .bind(nextAttempts, locked ? "locked" : "pending", challenge.id)
      .run();
    return { ok: false, error: locked ? "locked" : "invalid_code" };
  }

  const proofToken = randomToken(32);
  const proofHash = await sha256Hex(`proof:${proofToken}`);
  const proofId = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = new Date(now + PHONE_PROOF_TTL_MS).toISOString();

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE auth_challenges SET status = 'verified', verified_at = ? WHERE id = ?`,
    ).bind(new Date(now).toISOString(), challenge.id),
    env.DB.prepare(
      `INSERT INTO phone_proofs (id, phone_e164, purpose, challenge_id, proof_hash, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(
      proofId,
      params.phoneE164,
      params.purpose,
      challenge.id,
      proofHash,
      expiresAt,
    ),
  ]);

  return { ok: true, proofToken, expiresAt };
}

export type ConsumedProof = {
  phoneE164: string;
};

/** Single-use consumption: a proof can back exactly one register/reset/change call.
 * When `accountId` is known (e.g. change_phone), stamp `phone_proofs.account_id`.
 * Register/reset leave it null — no account yet, or no need to bind. */
export async function consumePhoneProof(
  env: Env,
  proofToken: string,
  purpose: OtpPurpose,
  options?: { accountId?: string },
): Promise<ConsumedProof | null> {
  const proofHash = await sha256Hex(`proof:${proofToken}`);
  const proof = await env.DB.prepare(
    `SELECT id, phone_e164, purpose, expires_at, consumed_at FROM phone_proofs
     WHERE proof_hash = ?`,
  )
    .bind(proofHash)
    .first<{
      id: string;
      phone_e164: string;
      purpose: string;
      expires_at: string;
      consumed_at: string | null;
    }>();

  if (!proof || proof.purpose !== purpose || proof.consumed_at) {
    return null;
  }
  if (new Date(proof.expires_at).getTime() <= Date.now()) {
    return null;
  }

  const nowIso = new Date().toISOString();
  const result = options?.accountId
    ? await env.DB.prepare(
        `UPDATE phone_proofs
         SET consumed_at = ?, account_id = COALESCE(account_id, ?)
         WHERE id = ? AND consumed_at IS NULL`,
      )
        .bind(nowIso, options.accountId, proof.id)
        .run()
    : await env.DB.prepare(
        `UPDATE phone_proofs SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL`,
      )
        .bind(nowIso, proof.id)
        .run();
  if ((result.meta.changes ?? 0) !== 1) {
    // Lost a race with a concurrent consumer.
    return null;
  }

  return { phoneE164: proof.phone_e164 };
}

export async function sweepExpiredOtp(
  env: Env,
): Promise<{ challenges: number; proofs: number }> {
  const nowIso = new Date().toISOString();
  // Proofs first: once expired they're dead regardless of the parent challenge's
  // status, and deleting challenges never needs a live proof row to exist.
  const [proofs, challenges] = await env.DB.batch([
    env.DB.prepare(`DELETE FROM phone_proofs WHERE expires_at < ?`).bind(nowIso),
    env.DB.prepare(`DELETE FROM auth_challenges WHERE expires_at < ?`).bind(nowIso),
  ]);
  return {
    proofs: proofs.meta.changes ?? 0,
    challenges: challenges.meta.changes ?? 0,
  };
}
