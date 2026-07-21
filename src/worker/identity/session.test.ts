import { env } from "cloudflare:workers";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Env } from "../env";
import {
  buildClearSessionCookie,
  buildSessionCookie,
  createSession,
  loadAuthContext,
  maskPhone,
  readSessionCookie,
  revokeAllOtherSessions,
  revokeSessionById,
  SESSION_COOKIE_NAME,
  sweepExpiredSessions,
} from "./session";
import { applyIdentitySchema, resetIdentityTables, testEnv } from "./test-support";

const testAppEnv = testEnv(env as Env);

async function insertAccount(id: string, phone: string) {
  await testAppEnv.DB.prepare(
    `INSERT INTO accounts (id, phone_e164, password_hash, phone_verified_at) VALUES (?, ?, 'hash', datetime('now'))`,
  )
    .bind(id, phone)
    .run();
}

describe("session lifecycle", () => {
  beforeAll(async () => {
    await applyIdentitySchema(testAppEnv);
  });

  beforeEach(async () => {
    await resetIdentityTables(testAppEnv);
  });

  it("creates and loads a session from its cookie", async () => {
    await insertAccount("acct-1", "+380671111111");
    const request = new Request("https://squadme.app/api/auth/me");
    const created = await createSession(testAppEnv, "acct-1", request);

    const cookieValue = created.token;
    const authedRequest = new Request("https://squadme.app/api/auth/me", {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${cookieValue}` },
    });

    const ctx = await loadAuthContext(testAppEnv, authedRequest);
    expect(ctx?.account.id).toBe("acct-1");
    expect(ctx?.session.id).toBe(created.sessionId);
  });

  it("returns null for a missing/garbage cookie", async () => {
    const request = new Request("https://squadme.app/api/auth/me", {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=not-a-real-token` },
    });
    expect(await loadAuthContext(testAppEnv, request)).toBeNull();
  });

  it("revokes a session by id", async () => {
    await insertAccount("acct-2", "+380672222222");
    const created = await createSession(
      testAppEnv,
      "acct-2",
      new Request("https://squadme.app/"),
    );
    await revokeSessionById(testAppEnv, created.sessionId);

    const request = new Request("https://squadme.app/api/auth/me", {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${created.token}` },
    });
    expect(await loadAuthContext(testAppEnv, request)).toBeNull();
  });

  it("revoke-all-except-current keeps only the current session alive", async () => {
    await insertAccount("acct-3", "+380673333333");
    const req = new Request("https://squadme.app/");
    const first = await createSession(testAppEnv, "acct-3", req);
    const second = await createSession(testAppEnv, "acct-3", req);
    const third = await createSession(testAppEnv, "acct-3", req);

    await revokeAllOtherSessions(testAppEnv, "acct-3", second.sessionId);

    const check = async (token: string) =>
      loadAuthContext(
        testAppEnv,
        new Request("https://squadme.app/api/auth/me", {
          headers: { Cookie: `${SESSION_COOKIE_NAME}=${token}` },
        }),
      );

    expect(await check(first.token)).toBeNull();
    expect(await check(third.token)).toBeNull();
    expect((await check(second.token))?.session.id).toBe(second.sessionId);
  });

  it("expires a session past its absolute TTL", async () => {
    await insertAccount("acct-4", "+380674444444");
    const created = await createSession(testAppEnv, "acct-4", new Request("https://squadme.app/"));
    await testAppEnv.DB.prepare(`UPDATE sessions SET expires_at = ? WHERE id = ?`)
      .bind(new Date(Date.now() - 1000).toISOString(), created.sessionId)
      .run();

    const request = new Request("https://squadme.app/api/auth/me", {
      headers: { Cookie: `${SESSION_COOKIE_NAME}=${created.token}` },
    });
    expect(await loadAuthContext(testAppEnv, request)).toBeNull();
  });

  it("sweeps expired sessions", async () => {
    await insertAccount("acct-5", "+380675555555");
    const created = await createSession(testAppEnv, "acct-5", new Request("https://squadme.app/"));
    await testAppEnv.DB.prepare(`UPDATE sessions SET expires_at = ? WHERE id = ?`)
      .bind(new Date(Date.now() - 1000).toISOString(), created.sessionId)
      .run();

    const removed = await sweepExpiredSessions(testAppEnv);
    expect(removed).toBeGreaterThanOrEqual(1);
  });

  it("builds cookies with the expected attributes", () => {
    const setCookie = buildSessionCookie(testAppEnv, "tok", new Date(Date.now() + 1000).toISOString());
    expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=tok`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");

    const clearCookie = buildClearSessionCookie(testAppEnv);
    expect(clearCookie).toContain("Max-Age=0");
  });

  it("reads the session cookie from a Cookie header with multiple cookies", () => {
    const request = new Request("https://squadme.app/", {
      headers: { Cookie: `foo=bar; ${SESSION_COOKIE_NAME}=abc123; baz=qux` },
    });
    expect(readSessionCookie(request)).toBe("abc123");
  });

  it("masks phone numbers for logs", () => {
    expect(maskPhone("+380671234567")).toBe("+380***67");
  });
});
