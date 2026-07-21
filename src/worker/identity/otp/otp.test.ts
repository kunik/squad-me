import { env } from "cloudflare:workers";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../env";
import {
  OTP_MAX_SENDS_PER_IP,
  OTP_MAX_SENDS_PER_PHONE,
  OTP_MAX_VERIFY_ATTEMPTS,
} from "../rate-limit";
import { applyIdentitySchema, resetIdentityTables, testEnv } from "../test-support";
import { consumePhoneProof, startOtpChallenge, sweepExpiredOtp, verifyOtpChallenge } from "./index";

const testAppEnv = testEnv(env as Env);

/** Fake provider logs the code instead of sending it — tests read it back from the log line. */
async function startAndCaptureCode(
  phoneE164: string,
  purpose: "register" | "password_reset" | "change_phone",
  ipHash = "ip-hash-a",
) {
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  const result = await startOtpChallenge(testAppEnv, { phoneE164, purpose, ipHash });
  const logged = logSpy.mock.calls.map((args) => String(args[0])).join("\n");
  logSpy.mockRestore();
  const match = logged.match(/code=(\d{6})/);
  if (!result.ok || !match) {
    throw new Error(`expected a successful start with a logged code, got: ${JSON.stringify(result)}`);
  }
  return { result, code: match[1] };
}

/** Inserts backdated challenges so cooldown does not apply; ages are within the send window. */
async function seedSendsInWindow(
  count: number,
  opts: { phone?: string; ipHash?: string; purpose?: string },
) {
  const purpose = opts.purpose ?? "register";
  for (let i = 0; i < count; i++) {
    const phone = opts.phone ?? `+38067222${String(i).padStart(4, "0")}`;
    const ipHash = opts.ipHash ?? `ip-${i}`;
    await testAppEnv.DB.prepare(
      `INSERT INTO auth_challenges (id, phone_e164, purpose, code_hash, ip_hash, provider, expires_at, created_at)
       VALUES (?, ?, ?, 'x', ?, 'fake', ?, ?)`,
    )
      .bind(
        `chal-${opts.phone ?? "ip"}-${i}`,
        phone,
        purpose,
        ipHash,
        new Date(Date.now() + 60_000).toISOString(),
        // Older than 30s cooldown, younger than the 15m send window.
        new Date(Date.now() - (60_000 + i * 1000)).toISOString(),
      )
      .run();
  }
}

describe("OTP start/verify (fake provider only)", () => {
  beforeAll(async () => {
    await applyIdentitySchema(testAppEnv);
  });

  beforeEach(async () => {
    await resetIdentityTables(testAppEnv);
  });

  it("never uses a real provider in tests", () => {
    expect(testAppEnv.OTP_SINK_MODE).toBe("log");
  });

  it("start then verify happy path issues a single-use proof", async () => {
    const { code } = await startAndCaptureCode("+380671110001", "register");

    const verified = await verifyOtpChallenge(testAppEnv, {
      phoneE164: "+380671110001",
      purpose: "register",
      code,
    });
    expect(verified.ok).toBe(true);
    if (!verified.ok) throw new Error("unreachable");

    const consumed = await consumePhoneProof(testAppEnv, verified.proofToken, "register");
    expect(consumed?.phoneE164).toBe("+380671110001");

    // Single-use: a second consumption of the same proof must fail.
    const consumedAgain = await consumePhoneProof(testAppEnv, verified.proofToken, "register");
    expect(consumedAgain).toBeNull();
  });

  it("rejects an incorrect code without consuming attempts silently", async () => {
    await startAndCaptureCode("+380671110002", "register");
    const result = await verifyOtpChallenge(testAppEnv, {
      phoneE164: "+380671110002",
      purpose: "register",
      code: "000000",
    });
    expect(result).toEqual({ ok: false, error: "invalid_code" });
  });

  it("locks the challenge after the max verify attempts", async () => {
    await startAndCaptureCode("+380671110003", "register");

    let last;
    for (let i = 0; i < OTP_MAX_VERIFY_ATTEMPTS; i++) {
      last = await verifyOtpChallenge(testAppEnv, {
        phoneE164: "+380671110003",
        purpose: "register",
        code: "000000",
      });
    }
    expect(last).toEqual({ ok: false, error: "locked" });

    // Even the correct code is rejected once locked.
    const row = await testAppEnv.DB.prepare(
      `SELECT code_hash FROM auth_challenges WHERE phone_e164 = ? ORDER BY created_at DESC LIMIT 1`,
    )
      .bind("+380671110003")
      .first<{ code_hash: string }>();
    expect(row).not.toBeNull();

    const stillLocked = await verifyOtpChallenge(testAppEnv, {
      phoneE164: "+380671110003",
      purpose: "register",
      code: "000000",
    });
    expect(stillLocked).toEqual({ ok: false, error: "locked" });
  });

  it("reuses a pending challenge during the resend cooldown (refresh-safe)", async () => {
    const first = await startAndCaptureCode("+380671110004", "register");
    const second = await startOtpChallenge(testAppEnv, {
      phoneE164: "+380671110004",
      purpose: "register",
      ipHash: "ip-hash-cooldown",
    });
    expect(second).toMatchObject({
      ok: true,
      challengeId: first.result.challengeId,
      expiresAt: first.result.expiresAt,
    });
    if (!second.ok) throw new Error("unreachable");
    expect(second.resendAfterSeconds).toBeGreaterThan(0);
    expect(second.resendAfterSeconds).toBeLessThanOrEqual(30);
  });

  it("enforces the resend cooldown when no pending challenge can be reused", async () => {
    await startAndCaptureCode("+380671110014", "register");
    await testAppEnv.DB.prepare(
      `UPDATE auth_challenges SET status = 'locked' WHERE phone_e164 = ?`,
    )
      .bind("+380671110014")
      .run();

    const second = await startOtpChallenge(testAppEnv, {
      phoneE164: "+380671110014",
      purpose: "register",
      ipHash: "ip-hash-cooldown-locked",
    });
    expect(second).toMatchObject({ ok: false, error: "rate_limited", reason: "cooldown" });
  });

  it(`allows ${OTP_MAX_SENDS_PER_PHONE - 1} early phone sends then blocks at the cap`, async () => {
    const phone = "+380671110005";
    await seedSendsInWindow(OTP_MAX_SENDS_PER_PHONE - 1, { phone, purpose: "register" });

    const allowed = await startOtpChallenge(testAppEnv, {
      phoneE164: phone,
      purpose: "register",
      ipHash: "ip-fresh-ok",
    });
    expect(allowed.ok).toBe(true);

    await testAppEnv.DB.prepare(
      `UPDATE auth_challenges SET created_at = ? WHERE phone_e164 = ?`,
    )
      .bind(new Date(Date.now() - 60_000).toISOString(), phone)
      .run();

    const blocked = await startOtpChallenge(testAppEnv, {
      phoneE164: phone,
      purpose: "register",
      ipHash: "ip-fresh-block",
    });
    expect(blocked).toMatchObject({ ok: false, error: "rate_limited", reason: "phone_limit" });
  });

  it(`allows ${OTP_MAX_SENDS_PER_IP - 1} early IP sends then blocks at the cap`, async () => {
    const ipHash = "ip-shared";
    await seedSendsInWindow(OTP_MAX_SENDS_PER_IP - 1, { ipHash });

    const allowed = await startOtpChallenge(testAppEnv, {
      phoneE164: "+380679999998",
      purpose: "register",
      ipHash,
    });
    expect(allowed.ok).toBe(true);

    await testAppEnv.DB.prepare(
      `UPDATE auth_challenges SET created_at = ? WHERE ip_hash = ?`,
    )
      .bind(new Date(Date.now() - 60_000).toISOString(), ipHash)
      .run();

    const blocked = await startOtpChallenge(testAppEnv, {
      phoneE164: "+380679999999",
      purpose: "register",
      ipHash,
    });
    expect(blocked).toMatchObject({ ok: false, error: "rate_limited", reason: "ip_limit" });
  });

  it("rejects an expired or unknown proof", async () => {
    expect(await consumePhoneProof(testAppEnv, "not-a-real-proof", "register")).toBeNull();
  });

  it("sweeps expired challenges and proofs", async () => {
    const { code } = await startAndCaptureCode("+380671110006", "register");
    const verified = await verifyOtpChallenge(testAppEnv, {
      phoneE164: "+380671110006",
      purpose: "register",
      code,
    });
    if (!verified.ok) throw new Error("unreachable");

    await testAppEnv.DB.prepare(`UPDATE auth_challenges SET expires_at = ? WHERE phone_e164 = ?`)
      .bind(new Date(Date.now() - 1000).toISOString(), "+380671110006")
      .run();
    await testAppEnv.DB.prepare(`UPDATE phone_proofs SET expires_at = ? WHERE phone_e164 = ?`)
      .bind(new Date(Date.now() - 1000).toISOString(), "+380671110006")
      .run();

    const swept = await sweepExpiredOtp(testAppEnv);
    expect(swept.challenges).toBeGreaterThanOrEqual(1);
    expect(swept.proofs).toBeGreaterThanOrEqual(1);
  });
});
