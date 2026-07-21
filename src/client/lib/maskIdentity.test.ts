import { describe, expect, it } from "vitest";
import { maskEmail, maskPhoneE164 } from "./maskIdentity";

describe("maskPhoneE164", () => {
  it("masks five middle digits on a typical UA E.164 number", () => {
    expect(maskPhoneE164("+380501112233")).toBe("+380*****2233");
  });

  it("keeps the + and balances visible digits", () => {
    expect(maskPhoneE164("+380671234567")).toBe("+380*****4567");
  });

  it("handles short numbers without breaking recognition", () => {
    expect(maskPhoneE164("12345")).toBe("1***5");
    expect(maskPhoneE164("1234")).toBe("1**4");
    expect(maskPhoneE164("123")).toBe("1*3");
  });

  it("fully obscures very short digit strings", () => {
    expect(maskPhoneE164("12")).toBe("**");
    expect(maskPhoneE164("1")).toBe("*");
  });

  it("trims whitespace and leaves empty input empty", () => {
    expect(maskPhoneE164("  +380501112233  ")).toBe("+380*****2233");
    expect(maskPhoneE164("")).toBe("");
    expect(maskPhoneE164("   ")).toBe("");
  });

  it("leaves non-digit strings unchanged", () => {
    expect(maskPhoneE164("n/a")).toBe("n/a");
  });
});

describe("maskEmail", () => {
  it("masks local prefix and domain, keeping TLD", () => {
    expect(maskEmail("john.doe@example.com")).toBe("joh***@***.com");
    expect(maskEmail("shooter@example.test")).toBe("sho***@***.test");
  });

  it("uses a short local part as-is before ***", () => {
    expect(maskEmail("ab@x.org")).toBe("ab***@***.org");
    expect(maskEmail("a@b.co")).toBe("a***@***.co");
  });

  it("uses the last domain label as TLD (e.g. .uk from co.uk)", () => {
    expect(maskEmail("user@mail.co.uk")).toBe("use***@***.uk");
  });

  it("falls back when the domain has no dot", () => {
    expect(maskEmail("user@localhost")).toBe("use***@***");
  });

  it("trims whitespace and leaves empty input empty", () => {
    expect(maskEmail("  john.doe@example.com  ")).toBe("joh***@***.com");
    expect(maskEmail("")).toBe("");
  });

  it("obscures values that are not email-shaped", () => {
    expect(maskEmail("not-an-email")).toBe("not***");
    expect(maskEmail("@nodomain")).toBe("@no***");
  });
});
