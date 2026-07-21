import { env } from "cloudflare:workers";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../env";
import { routeIdentityRequest } from "./routes";
import { loadAuthContext, SESSION_COOKIE_NAME } from "./session";
import { applyIdentitySchema, resetIdentityTables, testEnv } from "./test-support";

const testAppEnv = testEnv(env as Env);
const BASE = "https://squadme.app";

function request(path: string, init: RequestInit & { cookie?: string } = {}) {
  const { cookie, headers, ...rest } = init;
  const finalHeaders = new Headers(headers);
  if (rest.body) {
    finalHeaders.set("content-type", "application/json");
  }
  if (cookie) {
    finalHeaders.set("Cookie", cookie);
  }
  return new Request(`${BASE}${path}`, { ...rest, headers: finalHeaders });
}

async function call(path: string, init: RequestInit & { cookie?: string } = {}) {
  const req = request(path, init);
  const res = await routeIdentityRequest(req, testAppEnv, new URL(req.url).pathname);
  if (!res) {
    throw new Error(`no route matched ${path}`);
  }
  const body = await res.json().catch(() => null);
  return { status: res.status, body, headers: res.headers };
}

/** Backdates existing challenges so a fresh otp/start bypasses the resend cooldown in tests. */
async function bypassOtpCooldown(phone: string) {
  await testAppEnv.DB.prepare(
    `UPDATE auth_challenges SET created_at = ? WHERE phone_e164 = ?`,
  )
    .bind(new Date(Date.now() - 3600_000).toISOString(), phone)
    .run();
}

function extractCookie(headers: Headers): string {
  const raw = headers.get("Set-Cookie") ?? "";
  const match = raw.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  if (!match) {
    throw new Error(`no ${SESSION_COOKIE_NAME} cookie in response: ${raw}`);
  }
  return `${SESSION_COOKIE_NAME}=${match[1]}`;
}

/** Runs otp/start + otp/verify through the real routes and returns a usable proof token. */
async function getProofDetails(
  phone: string,
  purpose: "register" | "password_reset" | "change_phone",
  cookie?: string,
): Promise<{ proofToken: string; accountMode?: "created" | "password_reset" }> {
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  const start = await call("/api/auth/phone/otp/start", {
    method: "POST",
    body: JSON.stringify({ phone, purpose }),
    cookie,
  });
  expect(start.status).toBe(200);
  const logged = logSpy.mock.calls.map((args) => String(args[0])).join("\n");
  logSpy.mockRestore();
  const match = logged.match(/code=(\d{6})/);
  if (!match) {
    throw new Error(`expected fake provider to log a code, got: ${logged}`);
  }

  const verify = await call("/api/auth/phone/otp/verify", {
    method: "POST",
    body: JSON.stringify({ phone, purpose, code: match[1] }),
  });
  expect(verify.status).toBe(200);
  return verify.body as {
    proofToken: string;
    accountMode?: "created" | "password_reset";
  };
}

async function getProof(
  phone: string,
  purpose: "register" | "password_reset" | "change_phone",
  cookie?: string,
) {
  return (await getProofDetails(phone, purpose, cookie)).proofToken;
}

describe("identity routes", () => {
  beforeAll(async () => {
    await applyIdentitySchema(testAppEnv);
  });

  beforeEach(async () => {
    await resetIdentityTables(testAppEnv);
  });

  it("registers a new account and sets a session cookie", async () => {
    const proofToken = await getProof("+380671230001", "register");
    const res = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken, password: "correct-horse-1" , nickname: "Shooter"}),
    });
    expect(res.status).toBe(201);
    expect(res.headers.get("Set-Cookie")).toContain(SESSION_COOKIE_NAME);
    expect(res.body).toMatchObject({ accountMode: "created" });
  });

  it("register with an existing phone sets a new password and signs in (proof = reset authority)", async () => {
    const phone = "+380671230002";
    const firstProof = await getProof(phone, "register");
    const first = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: firstProof, password: "first-password-1" , nickname: "Shooter"}),
    });
    expect(first.status).toBe(201);
    const oldSessionCookie = extractCookie(first.headers);

    const originalProfile = await call("/api/profile", {
      method: "POST",
      cookie: oldSessionCookie,
      body: JSON.stringify({
        nickname: "Original",
        gender: "female",
        birthDate: "1990-05-15",
        upsfMember: true,
        firstNameUa: "Олена",
        lastNameUa: "Шевченко",
        region: "м. Київ",
        city: "Київ",
        club: "Динамо",
        ipscMember: true,
        firstNameEn: "Olena",
        lastNameEn: "Shevchenko",
        ipscMemberNumber: "UA-42",
        ipscRegion: "UA",
        pistol: { enabled: true, division: "production", powerFactor: "minor" },
      }),
    });
    expect(originalProfile.status).toBe(200);
    const completedAt = (originalProfile.body as {
      profile: { profileCompletedAt: string };
    }).profile.profileCompletedAt;
    expect(completedAt).toBeTruthy();

    await bypassOtpCooldown(phone);
    const secondProofResult = await getProofDetails(phone, "register");
    expect(secondProofResult.accountMode).toBe("password_reset");
    const secondProof = secondProofResult.proofToken;
    const second = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: secondProof, password: "second-password-1" , nickname: "Shooter"}),
    });
    expect(second.status).toBe(200);
    expect(second.headers.get("Set-Cookie")).toContain(SESSION_COOKIE_NAME);
    expect(second.body).toMatchObject({
      account: { phoneE164: phone },
      accountMode: "password_reset",
    });
    const newSessionCookie = extractCookie(second.headers);

    // Register includes nickname in the same request (sectional upsert) — must
    // preserve every existing profile field and completion marker (AUTH-001).
    const afterRegister = await call("/api/profile", { cookie: newSessionCookie });
    expect(afterRegister.status).toBe(200);
    expect(afterRegister.body).toMatchObject({
      profile: {
        nickname: "Shooter",
        gender: "female",
        birthDate: "1990-05-15",
        upsfMember: true,
        firstNameUa: "Олена",
        lastNameUa: "Шевченко",
        region: "м. Київ",
        city: "Київ",
        club: "Динамо",
        ipscMember: true,
        firstNameEn: "Olena",
        lastNameEn: "Shevchenko",
        ipscMemberNumber: "UA-42",
        ipscRegion: "UA",
        pistol: { enabled: true, division: "production", powerFactor: "minor" },
        profileCompletedAt: completedAt,
      },
    });

    const nicknameBootstrap = await call("/api/profile", {
      method: "POST",
      cookie: newSessionCookie,
      body: JSON.stringify({ section: "nickname", nickname: "Reset Nick" }),
    });
    expect(nicknameBootstrap.status).toBe(200);
    expect(nicknameBootstrap.body).toMatchObject({
      profile: {
        nickname: "Reset Nick",
        gender: "female",
        birthDate: "1990-05-15",
        upsfMember: true,
        firstNameUa: "Олена",
        lastNameUa: "Шевченко",
        region: "м. Київ",
        city: "Київ",
        club: "Динамо",
        ipscMember: true,
        firstNameEn: "Olena",
        lastNameEn: "Shevchenko",
        ipscMemberNumber: "UA-42",
        ipscRegion: "UA",
        pistol: { enabled: true, division: "production", powerFactor: "minor" },
        profileCompletedAt: completedAt,
      },
    });

    // New password works; old password does not.
    const loginNew = await call("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password: "second-password-1" }),
    });
    expect(loginNew.status).toBe(200);

    const loginOld = await call("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password: "first-password-1" }),
    });
    expect(loginOld.status).toBe(401);

    // Prior session from the first register is revoked (same as password reset).
    const meOld = await call("/api/auth/me", { cookie: oldSessionCookie });
    expect(meOld.status).toBe(401);
    const meNew = await call("/api/auth/me", { cookie: newSessionCookie });
    expect(meNew.status).toBe(200);

    // Consumed register proof cannot be reused.
    const reuse = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: secondProof, password: "third-password-1" , nickname: "Shooter"}),
    });
    expect(reuse.status).toBe(400);
    expect(reuse.body).toMatchObject({ error: "invalid_or_expired_proof" });
  });

  it("login uses a generic error for both wrong password and unknown account", async () => {
    const phone = "+380671230003";
    const proof = await getProof(phone, "register");
    await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: proof, password: "correct-password-1" , nickname: "Shooter"}),
    });

    const wrongPassword = await call("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password: "totally-wrong-1" }),
    });
    const unknownAccount = await call("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone: "+380679999998", password: "whatever-123" }),
    });

    expect(wrongPassword.status).toBe(401);
    expect(unknownAccount.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownAccount.body);
  });

  it("password reset revokes every other active session for the account", async () => {
    const phone = "+380671230004";
    const registerProof = await getProof(phone, "register");
    const registerRes = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: registerProof, password: "old-password-1" , nickname: "Shooter"}),
    });
    const oldSessionCookie = extractCookie(registerRes.headers);

    const resetProofDetails = await getProofDetails(phone, "password_reset");
    expect(resetProofDetails.accountMode).toBe("password_reset");
    const resetRes = await call("/api/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({
        proofToken: resetProofDetails.proofToken,
        newPassword: "new-password-1",
      }),
    });
    expect(resetRes.status).toBe(200);
    const newSessionCookie = extractCookie(resetRes.headers);

    const oldStillValid = await loadAuthContext(
      testAppEnv,
      request("/api/auth/me", { cookie: oldSessionCookie }),
    );
    expect(oldStillValid).toBeNull();

    const newValid = await loadAuthContext(
      testAppEnv,
      request("/api/auth/me", { cookie: newSessionCookie }),
    );
    expect(newValid?.account.phone_e164).toBe(phone);

    const loginWithOld = await call("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password: "old-password-1" }),
    });
    expect(loginWithOld.status).toBe(401);

    const loginWithNew = await call("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password: "new-password-1" }),
    });
    expect(loginWithNew.status).toBe(200);
  });

  it("password_reset OTP for an unknown phone remints a register proof (soft handoff)", async () => {
    const phone = "+380671230014";
    const details = await getProofDetails(phone, "password_reset");
    expect(details.accountMode).toBe("created");

    // Reminted proof must not work on password/reset…
    const resetAttempt = await call("/api/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({
        proofToken: details.proofToken,
        newPassword: "should-not-apply-1",
      }),
    });
    expect(resetAttempt.status).toBe(400);
    expect(resetAttempt.body).toMatchObject({ error: "invalid_or_expired_proof" });

    // …but finishes registration without a second OTP.
    const registerRes = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        proofToken: details.proofToken,
        password: "brand-new-password-1",
        nickname: "NewShooter",
      }),
    });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body).toMatchObject({
      account: { phoneE164: phone },
      accountMode: "created",
    });
  });

  it("phone change requires auth, updates the phone, and revokes other sessions", async () => {
    const phone = "+380671230005";
    const newPhone = "+380671230006";
    const registerProof = await getProof(phone, "register");
    const registerRes = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: registerProof, password: "device-password-1" , nickname: "Shooter"}),
    });
    const sessionA = extractCookie(registerRes.headers);

    const loginRes = await call("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password: "device-password-1" }),
    });
    const sessionB = extractCookie(loginRes.headers);

    const unauthStart = await call("/api/auth/phone/otp/start", {
      method: "POST",
      body: JSON.stringify({ phone: newPhone, purpose: "change_phone" }),
    });
    expect(unauthStart.status).toBe(401);

    const proof = await getProof(newPhone, "change_phone", sessionA);
    const changeRes = await call("/api/auth/phone/change", {
      method: "POST",
      body: JSON.stringify({ proofToken: proof }),
      cookie: sessionA,
    });
    expect(changeRes.status).toBe(200);
    expect(changeRes.body).toMatchObject({ phoneE164: newPhone });

    const sessionAStillValid = await loadAuthContext(
      testAppEnv,
      request("/api/auth/me", { cookie: sessionA }),
    );
    expect(sessionAStillValid?.account.phone_e164).toBe(newPhone);

    const sessionBRevoked = await loadAuthContext(
      testAppEnv,
      request("/api/auth/me", { cookie: sessionB }),
    );
    expect(sessionBRevoked).toBeNull();
  });

  it("profile upsert creates then updates a single row, no duplicate", async () => {
    const phone = "+380671230008";
    const proof = await getProof(phone, "register");
    const registerRes = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: proof, password: "profile-password-1" , nickname: "Shooter"}),
    });
    const cookie = extractCookie(registerRes.headers);

    // Register now seeds nickname via POST /api/auth/register — profile row exists.
    const getAfterRegister = await call("/api/profile", { cookie });
    expect(getAfterRegister.status).toBe(200);
    expect(getAfterRegister.body).toMatchObject({
      profile: { nickname: "Shooter", profileCompletedAt: null },
    });

    const created = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({
        nickname: "Fox007",
        upsfMember: true,
        firstNameUa: "Олена",
        lastNameUa: "Шевченко",
        region: "Київська",
        club: "Динамо",
        gender: "female",
        birthDate: "1990-05-15",
      }),
    });
    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({
      profile: { firstNameUa: "Олена", lastNameUa: "Шевченко", ipscRegion: null },
    });

    const updated = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({
        nickname: "Fox007",
        upsfMember: true,
        firstNameUa: "Олена",
        lastNameUa: "Коваленко",
        region: "Київська",
        club: "Динамо",
        gender: "female",
        birthDate: "1990-05-15",
        ipscMember: true,
        firstNameEn: "Olena",
        lastNameEn: "Kovalenko",
        ipscRegion: "ua",
      }),
    });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      profile: { lastNameUa: "Коваленко", ipscMember: true, ipscRegion: "UA" },
    });

    const countRow = await testAppEnv.DB.prepare(
      `SELECT COUNT(*) AS n FROM profiles WHERE account_id = (SELECT id FROM accounts WHERE phone_e164 = ?)`,
    )
      .bind(phone)
      .first<{ n: number }>();
    expect(countRow?.n).toBe(1);

    const fetched = await call("/api/profile", { cookie });
    expect(fetched.status).toBe(200);
    expect(fetched.body).toMatchObject({ profile: { lastNameUa: "Коваленко" } });
  });

  it("profile upsert requires auth", async () => {
    const res = await call("/api/profile", {
      method: "POST",
      body: JSON.stringify({
        firstNameUa: "Олена",
        lastNameUa: "Шевченко",
        gender: "female",
        birthDate: "1990-05-15",
      }),
    });
    expect(res.status).toBe(401);
  });

  it("profile upsert requires nickname, rejects bad charset, and validates UPSF/IPSC nested fields", async () => {
    const phone = "+380671230009";
    const proof = await getProof(phone, "register");
    const registerRes = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: proof, password: "profile-password-2" , nickname: "Shooter"}),
    });
    const cookie = extractCookie(registerRes.headers);

    const missingNickname = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({ birthDate: "1990-05-15" }),
    });
    expect(missingNickname.status).toBe(400);
    expect(missingNickname.body).toMatchObject({ error: "invalid_profile", field: "nickname" });

    const aloneOk = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({ nickname: "Fox007", gender: "female" }),
    });
    expect(aloneOk.status).toBe(200);
    expect(aloneOk.body).toMatchObject({
      profile: { nickname: "Fox007", gender: "female", birthDate: null },
    });

    const latinUaName = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({
        nickname: "Fox007",
        upsfMember: true,
        firstNameUa: "Olena",
        lastNameUa: "Шевченко",
        region: "Київська",
        club: "Динамо",
        gender: "female",
        birthDate: "1990-05-15",
      }),
    });
    expect(latinUaName.status).toBe(400);
    expect(latinUaName.body).toMatchObject({ error: "invalid_profile", field: "firstNameUa" });

    const missingUpsfClub = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({
        nickname: "Fox007",
        upsfMember: true,
        firstNameUa: "Олена",
        lastNameUa: "Шевченко",
        region: "Київська",
      }),
    });
    expect(missingUpsfClub.status).toBe(400);
    expect(missingUpsfClub.body).toMatchObject({ error: "invalid_profile", field: "club" });

    const cyrillicEnName = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({
        nickname: "Fox007",
        ipscMember: true,
        firstNameEn: "Олена",
        lastNameEn: "Shevchenko",
        gender: "female",
        birthDate: "1990-05-15",
      }),
    });
    expect(cyrillicEnName.status).toBe(400);
    expect(cyrillicEnName.body).toMatchObject({ error: "invalid_profile", field: "firstNameEn" });
  });

  it("profile upsert accepts and updates the temporary free-text club field", async () => {
    const phone = "+380671230012";
    const proof = await getProof(phone, "register");
    const registerRes = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: proof, password: "club-password-1" , nickname: "Shooter"}),
    });
    const cookie = extractCookie(registerRes.headers);

    const created = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({
        nickname: "Fox007",
        upsfMember: true,
        firstNameUa: "Олена",
        lastNameUa: "Шевченко",
        region: "Київська",
        gender: "female",
        birthDate: "1990-05-15",
        club: "Дніпро Динамо",
      }),
    });
    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({ profile: { club: "Дніпро Динамо" } });

    const tooLong = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({
        nickname: "Fox007",
        upsfMember: true,
        firstNameUa: "Олена",
        lastNameUa: "Шевченко",
        region: "Київська",
        club: "a".repeat(101),
        gender: "female",
        birthDate: "1990-05-15",
      }),
    });
    expect(tooLong.status).toBe(400);
  });

  it("profile upsert accepts EN-only or nickname-only names (no UA name required)", async () => {
    const phoneEn = "+380671230013";
    const proofEn = await getProof(phoneEn, "register");
    const registerEn = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: proofEn, password: "name-password-1" , nickname: "Shooter"}),
    });
    const cookieEn = extractCookie(registerEn.headers);
    const enOnly = await call("/api/profile", {
      method: "POST",
      cookie: cookieEn,
      body: JSON.stringify({
        nickname: "Fox007",
        ipscMember: true,
        firstNameEn: "Olena",
        lastNameEn: "Shevchenko",
        gender: "female",
        birthDate: "1990-05-15",
      }),
    });
    expect(enOnly.status).toBe(200);

    const phoneNick = "+380671230014";
    const proofNick = await getProof(phoneNick, "register");
    const registerNick = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: proofNick, password: "name-password-2" , nickname: "Shooter"}),
    });
    const cookieNick = extractCookie(registerNick.headers);
    const nicknameOnly = await call("/api/profile", {
      method: "POST",
      cookie: cookieNick,
      body: JSON.stringify({
        nickname: "Fox007",
        gender: "female",
        birthDate: "1990-05-15",
      }),
    });
    expect(nicknameOnly.status).toBe(200);
  });

  it("profile upsert requires nickname but allows empty gender/birth and membership off", async () => {
    const phone = "+380671230015";
    const proof = await getProof(phone, "register");
    const registerRes = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: proof, password: "name-password-3" , nickname: "Shooter"}),
    });
    const cookie = extractCookie(registerRes.headers);

    const nicknameOnly = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({ nickname: "Fox007" }),
    });
    expect(nicknameOnly.status).toBe(200);
    expect(nicknameOnly.body).toMatchObject({
      profile: {
        firstNameUa: null,
        firstNameEn: null,
        nickname: "Fox007",
        gender: null,
        birthDate: null,
      },
    });

    const missingUpsfFields = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({
        nickname: "Fox007",
        upsfMember: true,
        firstNameUa: "Олена",
        gender: "female",
        birthDate: "1990-05-15",
      }),
    });
    expect(missingUpsfFields.status).toBe(400);
    expect(missingUpsfFields.body).toMatchObject({ error: "invalid_profile" });
  });

  it("profile sectional upsert accepts nickname-only without completing onboarding", async () => {
    const phone = "+380671230016";
    const proof = await getProof(phone, "register");
    const registerRes = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: proof, password: "nickname-only-1", nickname: "Shooter" }),
    });
    const cookie = extractCookie(registerRes.headers);

    const nicknameOnly = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({ section: "nickname", nickname: "Fox007" }),
    });
    expect(nicknameOnly.status).toBe(200);
    expect(nicknameOnly.body).toMatchObject({
      profile: { nickname: "Fox007", gender: null, birthDate: null, profileCompletedAt: null },
    });
  });

  it("GET /api/auth/me onboardingStep: profile → disciplines → email → null", async () => {
    const phone = "+380671230017";
    const proof = await getProof(phone, "register");
    const registerRes = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: proof, password: "show-prompt-1" , nickname: "Shooter"}),
    });
    const cookie = extractCookie(registerRes.headers);

    // Resilience scenario: account + session exist (OTP + password already
    // succeeded) but the browser closed before the fuller profile step ever
    // submitted or was skipped.
    const meRightAfterRegister = await call("/api/auth/me", { cookie });
    expect(meRightAfterRegister.status).toBe(200);
    expect(meRightAfterRegister.body).toMatchObject({
      onboardingStep: "profile",
      showProfilePrompt: true,
    });

    const nicknameOnly = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({ section: "nickname", nickname: "Fox007" }),
    });
    expect(nicknameOnly.status).toBe(200);
    const meAfterNicknameOnly = await call("/api/auth/me", { cookie });
    expect(meAfterNicknameOnly.body).toMatchObject({
      onboardingStep: "profile",
      showProfilePrompt: true,
    });

    const fullSave = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({ nickname: "Fox007", gender: "female", birthDate: "1990-05-15" }),
    });
    expect(fullSave.status).toBe(200);
    const meAfterFullSave = await call("/api/auth/me", { cookie });
    expect(meAfterFullSave.body).toMatchObject({
      onboardingStep: "disciplines",
      showProfilePrompt: false,
    });

    const divisionsSave = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({
        section: "disciplines",
        pistol: { enabled: true, division: "production", powerFactor: "minor" },
        carbine: { enabled: false },
        pccMiniRifle: { enabled: false },
        shotgun: { enabled: false },
      }),
    });
    expect(divisionsSave.status).toBe(200);
    const meAfterDivisions = await call("/api/auth/me", { cookie });
    expect(meAfterDivisions.body).toMatchObject({
      onboardingStep: "email",
      showProfilePrompt: false,
    });

    const setEmail = await call("/api/auth/account/email", {
      method: "POST",
      cookie,
      body: JSON.stringify({ email: "fox007@example.com" }),
    });
    expect(setEmail.status).toBe(200);
    const meAfterEmail = await call("/api/auth/me", { cookie });
    expect(meAfterEmail.body).toMatchObject({ onboardingStep: null, showProfilePrompt: false });
  });

  it("GET /api/auth/me advances profile → disciplines → email via Skip dismissals", async () => {
    const phone = "+380671230018";
    const proof = await getProof(phone, "register");
    const registerRes = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: proof, password: "show-prompt-2" , nickname: "Shooter"}),
    });
    const cookie = extractCookie(registerRes.headers);

    await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({ section: "nickname", nickname: "Fox007" }),
    });
    const meBeforeSkip = await call("/api/auth/me", { cookie });
    expect(meBeforeSkip.body).toMatchObject({ onboardingStep: "profile", showProfilePrompt: true });

    const dismissed = await call("/api/auth/account/profile-prompt/dismiss", {
      method: "POST",
      cookie,
    });
    expect(dismissed.status).toBe(200);
    expect(dismissed.body).toMatchObject({ ok: true });

    const meAfterProfileSkip = await call("/api/auth/me", { cookie });
    expect(meAfterProfileSkip.body).toMatchObject({
      onboardingStep: "disciplines",
      showProfilePrompt: false,
    });

    const disciplinesDismissed = await call("/api/auth/account/disciplines-prompt/dismiss", {
      method: "POST",
      cookie,
    });
    expect(disciplinesDismissed.status).toBe(200);
    expect(disciplinesDismissed.body).toMatchObject({ ok: true });

    const meAfterDisciplinesSkip = await call("/api/auth/me", { cookie });
    expect(meAfterDisciplinesSkip.body).toMatchObject({
      onboardingStep: "email",
      showProfilePrompt: false,
    });

    const emailDismissed = await call("/api/auth/account/email-prompt/dismiss", {
      method: "POST",
      cookie,
    });
    expect(emailDismissed.status).toBe(200);
    expect(emailDismissed.body).toMatchObject({ ok: true });

    const meAfterEmailSkip = await call("/api/auth/me", { cookie });
    expect(meAfterEmailSkip.body).toMatchObject({ onboardingStep: null });
  });

  it("empty disciplines section save still clears the disciplines onboarding prompt", async () => {
    const phone = "+380671230021";
    const proof = await getProof(phone, "register");
    const registerRes = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: proof, password: "empty-disciplines-1" , nickname: "Shooter"}),
    });
    const cookie = extractCookie(registerRes.headers);

    await call("/api/auth/account/profile-prompt/dismiss", { method: "POST", cookie });
    const meBefore = await call("/api/auth/me", { cookie });
    expect(meBefore.body).toMatchObject({ onboardingStep: "disciplines" });

    const emptySave = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({
        section: "disciplines",
        pistol: { enabled: false },
        carbine: { enabled: false },
        pccMiniRifle: { enabled: false },
        shotgun: { enabled: false },
      }),
    });
    expect(emptySave.status).toBe(200);
    const meAfter = await call("/api/auth/me", { cookie });
    expect(meAfter.body).toMatchObject({ onboardingStep: "email" });
  });

  it("profile sectional upsert merges without wiping other fields", async () => {
    const phone = "+380671230020";
    const proof = await getProof(phone, "register");
    const registerRes = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: proof, password: "section-merge-1" , nickname: "Shooter"}),
    });
    const cookie = extractCookie(registerRes.headers);

    const nick = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({ section: "nickname", nickname: "Fox007" }),
    });
    expect(nick.status).toBe(200);
    expect(nick.body).toMatchObject({
      profile: { nickname: "Fox007", gender: null, profileCompletedAt: null },
    });

    const birth = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({
        section: "birth_gender",
        gender: "female",
        birthDate: "1990-05-15",
      }),
    });
    expect(birth.status).toBe(200);
    expect(birth.body).toMatchObject({
      profile: {
        nickname: "Fox007",
        gender: "female",
        birthDate: "1990-05-15",
      },
    });
    expect(
      (birth.body as { profile: { profileCompletedAt: string | null } }).profile.profileCompletedAt,
    ).toBeTruthy();

    const upsf = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({
        section: "upsf",
        upsfMember: true,
        firstNameUa: "Олена",
        lastNameUa: "Шевченко",
        region: "м. Київ",
        city: "Київ",
        club: "Динамо",
      }),
    });
    expect(upsf.status).toBe(200);
    expect(upsf.body).toMatchObject({
      profile: {
        nickname: "Fox007",
        gender: "female",
        upsfMember: true,
        firstNameUa: "Олена",
        club: "Динамо",
      },
    });

    const pistol = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({
        section: "discipline_pistol",
        enabled: true,
        division: "open",
      }),
    });
    expect(pistol.status).toBe(200);
    expect(pistol.body).toMatchObject({
      profile: {
        nickname: "Fox007",
        firstNameUa: "Олена",
        pistol: { enabled: true, division: "open", powerFactor: "minor" },
        carbine: { enabled: false },
      },
    });

    const nickAgain = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({ section: "nickname", nickname: "Wolf" }),
    });
    expect(nickAgain.status).toBe(200);
    expect(nickAgain.body).toMatchObject({
      profile: {
        nickname: "Wolf",
        firstNameUa: "Олена",
        pistol: { enabled: true, division: "open" },
      },
    });

    const upsfOff = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({ section: "upsf", upsfMember: false }),
    });
    expect(upsfOff.status).toBe(200);
    expect(upsfOff.body).toMatchObject({
      profile: {
        upsfMember: false,
        firstNameUa: null,
        region: null,
        club: null,
        pistol: { enabled: true, division: "open" },
      },
    });
  });

  it("PROFILE-001 profile and disciplines aggregate saves preserve each other", async () => {
    const phone = "+380671230021";
    const proof = await getProof(phone, "register");
    const registered = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: proof, password: "aggregate-sections-1" , nickname: "Shooter"}),
    });
    const cookie = extractCookie(registered.headers);

    const profileSave = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({
        section: "profile",
        nickname: "Falcon",
        gender: "female",
        birthDate: "1992-04-03",
        upsfMember: true,
        firstNameUa: "Олена",
        lastNameUa: "Шевченко",
        region: "Київська",
        club: "Динамо",
      }),
    });
    expect(profileSave.status).toBe(200);
    const completedAt = (profileSave.body as {
      profile: { profileCompletedAt: string };
    }).profile.profileCompletedAt;
    expect(completedAt).toBeTruthy();

    const divisionsSave = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({
        section: "disciplines",
        pistol: { enabled: true, division: "production", powerFactor: "minor" },
        carbine: { enabled: false },
        pccMiniRifle: { enabled: false },
        shotgun: { enabled: false },
      }),
    });
    expect(divisionsSave.body).toMatchObject({
      profile: {
        nickname: "Falcon",
        firstNameUa: "Олена",
        pistol: { enabled: true, division: "production" },
        profileCompletedAt: completedAt,
      },
    });

    const profileAgain = await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({
        section: "profile",
        nickname: "Falcon 2",
        gender: "female",
        birthDate: "1992-04-03",
        upsfMember: false,
        ipscMember: false,
      }),
    });
    expect(profileAgain.body).toMatchObject({
      profile: {
        nickname: "Falcon 2",
        pistol: { enabled: true, division: "production", powerFactor: "minor" },
      },
    });
    expect(
      (profileAgain.body as { profile: { profileCompletedAt: string | null } }).profile
        .profileCompletedAt,
    ).toBeTruthy();
  });

  it("profile/disciplines/email prompt dismiss require auth and are idempotent", async () => {
    const unauthProfile = await call("/api/auth/account/profile-prompt/dismiss", { method: "POST" });
    expect(unauthProfile.status).toBe(401);
    const unauthDisciplines = await call("/api/auth/account/disciplines-prompt/dismiss", {
      method: "POST",
    });
    expect(unauthDisciplines.status).toBe(401);
    const unauthEmail = await call("/api/auth/account/email-prompt/dismiss", { method: "POST" });
    expect(unauthEmail.status).toBe(401);

    const phone = "+380671230019";
    const proof = await getProof(phone, "register");
    const registerRes = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: proof, password: "dismiss-idempotent-1" , nickname: "Shooter"}),
    });
    const cookie = extractCookie(registerRes.headers);

    const firstProfile = await call("/api/auth/account/profile-prompt/dismiss", {
      method: "POST",
      cookie,
    });
    expect(firstProfile.status).toBe(200);

    const secondProfile = await call("/api/auth/account/profile-prompt/dismiss", {
      method: "POST",
      cookie,
    });
    expect(secondProfile.status).toBe(200);
    expect(secondProfile.body).toMatchObject({ ok: true });

    const meAfterProfile = await call("/api/auth/me", { cookie });
    expect(meAfterProfile.body).toMatchObject({
      onboardingStep: "disciplines",
      showProfilePrompt: false,
    });

    const firstDisciplines = await call("/api/auth/account/disciplines-prompt/dismiss", {
      method: "POST",
      cookie,
    });
    expect(firstDisciplines.status).toBe(200);
    const secondDisciplines = await call("/api/auth/account/disciplines-prompt/dismiss", {
      method: "POST",
      cookie,
    });
    expect(secondDisciplines.status).toBe(200);
    expect(secondDisciplines.body).toMatchObject({ ok: true });

    const meAfterDisciplines = await call("/api/auth/me", { cookie });
    expect(meAfterDisciplines.body).toMatchObject({
      onboardingStep: "email",
      showProfilePrompt: false,
    });

    const firstEmail = await call("/api/auth/account/email-prompt/dismiss", {
      method: "POST",
      cookie,
    });
    expect(firstEmail.status).toBe(200);
    const secondEmail = await call("/api/auth/account/email-prompt/dismiss", {
      method: "POST",
      cookie,
    });
    expect(secondEmail.status).toBe(200);
    expect(secondEmail.body).toMatchObject({ ok: true });

    const me = await call("/api/auth/me", { cookie });
    expect(me.body).toMatchObject({ onboardingStep: null, showProfilePrompt: false });
  });

  it("account email happy path, duplicate returns generic 409, unauthenticated returns 401", async () => {
    const phoneA = "+380671230010";
    const phoneB = "+380671230011";
    const proofA = await getProof(phoneA, "register");
    const registerA = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: proofA, password: "email-password-1" , nickname: "Shooter"}),
    });
    const cookieA = extractCookie(registerA.headers);

    const proofB = await getProof(phoneB, "register");
    const registerB = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: proofB, password: "email-password-2" , nickname: "Shooter"}),
    });
    const cookieB = extractCookie(registerB.headers);

    const unauth = await call("/api/auth/account/email", {
      method: "POST",
      body: JSON.stringify({ email: "shooter@example.com" }),
    });
    expect(unauth.status).toBe(401);

    const setA = await call("/api/auth/account/email", {
      method: "POST",
      cookie: cookieA,
      body: JSON.stringify({ email: "Shooter@Example.com" }),
    });
    expect(setA.status).toBe(200);
    expect(setA.body).toMatchObject({ ok: true, email: "shooter@example.com" });

    const invalidShape = await call("/api/auth/account/email", {
      method: "POST",
      cookie: cookieB,
      body: JSON.stringify({ email: "not-an-email" }),
    });
    expect(invalidShape.status).toBe(400);

    const duplicate = await call("/api/auth/account/email", {
      method: "POST",
      cookie: cookieB,
      body: JSON.stringify({ email: "shooter@example.com" }),
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toMatchObject({ error: "email_already_used" });
  });

  it("deletes login/profile PII while preserving previous and active registration snapshots", async () => {
    const phone = "+380671230030";
    const proof = await getProof(phone, "register");
    const registered = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: proof, password: "delete-account-1" , nickname: "Shooter"}),
    });
    const cookie = extractCookie(registered.headers);
    const accountId = (registered.body as { account: { id: string } }).account.id;

    await call("/api/profile", {
      method: "POST",
      cookie,
      body: JSON.stringify({
        section: "profile",
        nickname: "Falcon",
        firstNameUa: "Олена",
        lastNameUa: "Шевченко",
        firstNameEn: "Olena",
        lastNameEn: "Shevchenko",
        gender: "female",
        birthDate: "1990-05-15",
        upsfMember: true,
        region: "м. Київ",
        city: "Київ",
        club: "Динамо",
        ipscMember: true,
        ipscMemberNumber: "UA-42",
        ipscRegion: "UA",
      }),
    });
    await call("/api/auth/account/email", {
      method: "POST",
      cookie,
      body: JSON.stringify({ email: "falcon@example.com" }),
    });

    const profile = await testAppEnv.DB.prepare(
      `SELECT id FROM profiles WHERE account_id = ?`,
    )
      .bind(accountId)
      .first<{ id: string }>();
    expect(profile).toBeTruthy();

    // Forward-compatibility fixture for the canonical registration model:
    // Registration retains both its Profile FK and immutable submitted data.
    await testAppEnv.DB.prepare(
      `CREATE TABLE IF NOT EXISTS account_deletion_registration_fixtures (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL REFERENCES profiles(id),
        creator_account_id TEXT NOT NULL REFERENCES accounts(id),
        status TEXT NOT NULL,
        snapshot_name TEXT NOT NULL,
        snapshot_birth_date TEXT NOT NULL
      )`,
    ).run();
    await testAppEnv.DB.batch([
      testAppEnv.DB.prepare(
        `INSERT INTO account_deletion_registration_fixtures
         (id, profile_id, creator_account_id, status, snapshot_name, snapshot_birth_date)
         VALUES (?, ?, ?, 'approved', 'Олена Шевченко', '1990-05-15')`,
      ).bind("registration-previous", profile!.id, accountId),
      testAppEnv.DB.prepare(
        `INSERT INTO account_deletion_registration_fixtures
         (id, profile_id, creator_account_id, status, snapshot_name, snapshot_birth_date)
         VALUES (?, ?, ?, 'pending', 'Olena Shevchenko', '1990-05-15')`,
      ).bind("registration-active", profile!.id, accountId),
      testAppEnv.DB.prepare(
        `INSERT INTO account_telegram_links
         (id, account_id, telegram_user_id, telegram_chat_id)
         VALUES ('telegram-delete', ?, 'tg-user-delete', 'tg-chat-delete')`,
      ).bind(accountId),
      testAppEnv.DB.prepare(
        `INSERT INTO push_subscriptions
         (id, account_id, endpoint, p256dh, auth_key)
         VALUES ('push-delete', ?, 'https://push.example/delete', 'key', 'auth')`,
      ).bind(accountId),
      testAppEnv.DB.prepare(
        `INSERT INTO auth_rate_limits (scope, subject, fail_count)
         VALUES ('login_account', ?, 3)`,
      ).bind(accountId),
      testAppEnv.DB.prepare(
        `INSERT INTO auth_challenges
         (id, phone_e164, purpose, code_hash, ip_hash, provider, status, expires_at)
         VALUES ('challenge-delete', ?, 'password_reset', 'hash', 'ip', 'fake', 'pending', ?)`,
      ).bind(phone, new Date(Date.now() + 60_000).toISOString()),
      testAppEnv.DB.prepare(
        `INSERT INTO phone_proofs
         (id, phone_e164, purpose, challenge_id, proof_hash, account_id, expires_at)
         VALUES ('proof-delete', ?, 'password_reset', 'challenge-delete', 'proof-hash-delete', ?, ?)`,
      ).bind(phone, accountId, new Date(Date.now() + 60_000).toISOString()),
    ]);

    const crossOrigin = await call("/api/auth/account", {
      method: "DELETE",
      cookie,
      headers: { Origin: "https://attacker.example" },
    });
    expect(crossOrigin.status).toBe(403);

    const deleted = await call("/api/auth/account", { method: "DELETE", cookie });
    expect(deleted.status).toBe(200);
    expect(deleted.body).toEqual({ ok: true });
    expect(deleted.headers.get("Set-Cookie")).toContain("Max-Age=0");

    const account = await testAppEnv.DB.prepare(`SELECT * FROM accounts WHERE id = ?`)
      .bind(accountId)
      .first<Record<string, unknown>>();
    expect(account).toMatchObject({
      id: accountId,
      email: null,
      profile_prompt_dismissed_at: null,
      disciplines_prompt_dismissed_at: null,
      email_prompt_dismissed_at: null,
    });
    expect(account?.phone_e164).not.toBe(phone);
    expect(account?.password_hash).not.toContain("$scrypt$");
    expect(account?.deleted_at).toBeTruthy();

    const anonymizedProfile = await testAppEnv.DB.prepare(`SELECT * FROM profiles WHERE id = ?`)
      .bind(profile!.id)
      .first<Record<string, unknown>>();
    expect(anonymizedProfile).toMatchObject({
      account_id: accountId,
      first_name_ua: null,
      last_name_ua: null,
      first_name_en: null,
      last_name_en: null,
      nickname: null,
      gender: null,
      birth_date: null,
      upsf_member: 0,
      club: null,
      ipsc_member: 0,
      ipsc_member_number: null,
    });
    expect(anonymizedProfile?.deleted_at).toBeTruthy();

    const registrations = await testAppEnv.DB.prepare(
      `SELECT * FROM account_deletion_registration_fixtures ORDER BY id`,
    ).all<Record<string, unknown>>();
    expect(registrations.results).toEqual([
      expect.objectContaining({
        id: "registration-active",
        profile_id: profile!.id,
        creator_account_id: accountId,
        status: "pending",
        snapshot_name: "Olena Shevchenko",
        snapshot_birth_date: "1990-05-15",
      }),
      expect.objectContaining({
        id: "registration-previous",
        profile_id: profile!.id,
        creator_account_id: accountId,
        status: "approved",
        snapshot_name: "Олена Шевченко",
        snapshot_birth_date: "1990-05-15",
      }),
    ]);

    for (const table of [
      "sessions",
      "account_telegram_links",
      "push_subscriptions",
      "phone_proofs",
      "auth_challenges",
    ]) {
      const row = await testAppEnv.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{
        n: number;
      }>();
      expect(row?.n).toBe(0);
    }
    const accountRateLimit = await testAppEnv.DB.prepare(
      `SELECT COUNT(*) AS n FROM auth_rate_limits
       WHERE scope = 'login_account' AND subject = ?`,
    )
      .bind(accountId)
      .first<{ n: number }>();
    expect(accountRateLimit?.n).toBe(0);

    const staleSession = await call("/api/auth/me", { cookie });
    expect(staleSession.status).toBe(401);
    const repeatedDelete = await call("/api/auth/account", { method: "DELETE", cookie });
    expect(repeatedDelete.status).toBe(401);
    const unauthenticatedDelete = await call("/api/auth/account", { method: "DELETE" });
    expect(unauthenticatedDelete.status).toBe(401);

    await bypassOtpCooldown(phone);
    const freshProof = await getProof(phone, "register");
    const freshRegistration = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: freshProof, password: "fresh-account-1" , nickname: "Shooter"}),
    });
    expect(freshRegistration.status).toBe(201);
    expect(freshRegistration.body).toMatchObject({
      accountMode: "created",
      account: { phoneE164: phone },
    });
    expect((freshRegistration.body as { account: { id: string } }).account.id).not.toBe(accountId);

    // Keep the global test reset helper independent of this one-off FK fixture.
    await testAppEnv.DB.prepare(`DELETE FROM account_deletion_registration_fixtures`).run();
  });

  it("me / logout reflect session state", async () => {
    const anon = await call("/api/auth/me");
    expect(anon.status).toBe(401);

    const phone = "+380671230007";
    const proof = await getProof(phone, "register");
    const registerRes = await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ proofToken: proof, password: "logout-password-1" , nickname: "Shooter"}),
    });
    const cookie = extractCookie(registerRes.headers);

    const me = await call("/api/auth/me", { cookie });
    expect(me.status).toBe(200);

    const logout = await call("/api/auth/logout", { method: "POST", cookie });
    expect(logout.status).toBe(200);

    const meAfterLogout = await call("/api/auth/me", { cookie });
    expect(meAfterLogout.status).toBe(401);
  });

  it("rejects otp/start when Turnstile verification fails", async () => {
    const failingEnv = testEnv(testAppEnv, {
      TURNSTILE_SECRET_KEY: "test-turnstile-secret",
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ success: false }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    try {
      const req = request("/api/auth/phone/otp/start", {
        method: "POST",
        body: JSON.stringify({
          phone: "+380671230090",
          purpose: "register",
          turnstileToken: "bad-token",
        }),
      });
      const res = await routeIdentityRequest(req, failingEnv, "/api/auth/phone/otp/start");
      expect(res?.status).toBe(400);
      const body = await res!.json();
      expect(body).toMatchObject({ error: "turnstile_failed" });
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("rejects state-changing auth requests with a disallowed Origin", async () => {
    const res = await call("/api/auth/login", {
      method: "POST",
      headers: { Origin: "https://evil.example" },
      body: JSON.stringify({ phone: "+380671230091", password: "whatever-123" }),
    });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: "origin_not_allowed" });
  });

  it("locks out login after repeated failures for the same account", async () => {
    const phone = "+380671230092";
    const proof = await getProof(phone, "register");
    await call("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        proofToken: proof,
        password: "lockout-password-1",
        nickname: "Shooter",
      }),
    });

    for (let i = 0; i < 5; i++) {
      const fail = await call("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ phone, password: "wrong-password-1" }),
      });
      expect(fail.status).toBe(401);
    }

    const locked = await call("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password: "lockout-password-1" }),
    });
    expect(locked.status).toBe(429);
    expect(locked.body).toMatchObject({ error: "rate_limited" });
    expect(locked.headers.get("Retry-After")).toBeTruthy();
  }, 60_000);
});
