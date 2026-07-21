import { describe, expect, it } from "vitest";
import {
  hashPassword,
  verifyPassword,
  assertPasswordLength,
  PasswordLengthError,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from "./password";

describe("password hashing", () => {
  it("round-trips a valid password", async () => {
    const hash = await hashPassword("correct-horse-battery");
    expect(await verifyPassword("correct-horse-battery", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct-horse-battery");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces a different salt (and hash) each time", async () => {
    const a = await hashPassword("same-password-1234");
    const b = await hashPassword("same-password-1234");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same-password-1234", a)).toBe(true);
    expect(await verifyPassword("same-password-1234", b)).toBe(true);
  });

  it("enforces the minimum length before hashing", async () => {
    await expect(hashPassword("short")).rejects.toThrow(PasswordLengthError);
  });

  it("enforces the maximum length before hashing", async () => {
    const tooLong = "a".repeat(PASSWORD_MAX_LENGTH + 1);
    await expect(hashPassword(tooLong)).rejects.toThrow(PasswordLengthError);
  });

  it("accepts the boundary lengths", () => {
    expect(() => assertPasswordLength("a".repeat(PASSWORD_MIN_LENGTH))).not.toThrow();
    expect(() => assertPasswordLength("a".repeat(PASSWORD_MAX_LENGTH))).not.toThrow();
  });

  it("verify never throws on malformed stored hashes", async () => {
    await expect(verifyPassword("anything", "not-a-real-hash")).resolves.toBe(false);
  });

  it("verify returns false (not throw) for over-length input", async () => {
    const hash = await hashPassword("valid-password-123");
    const tooLong = "a".repeat(PASSWORD_MAX_LENGTH + 1);
    await expect(verifyPassword(tooLong, hash)).resolves.toBe(false);
  });
});
