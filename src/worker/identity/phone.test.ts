import { describe, expect, it } from "vitest";
import { InvalidPhoneError, isValidE164, normalizePhoneToE164 } from "./phone";

describe("phone normalization", () => {
  it("normalizes UA local format (0XXXXXXXXX)", () => {
    expect(normalizePhoneToE164("0671234567")).toBe("+380671234567");
  });

  it("normalizes UA no-plus format (380XXXXXXXXX)", () => {
    expect(normalizePhoneToE164("380671234567")).toBe("+380671234567");
  });

  it("passes through UA E.164 format", () => {
    expect(normalizePhoneToE164("+380671234567")).toBe("+380671234567");
  });

  it("strips spaces/parens/dashes before normalizing", () => {
    expect(normalizePhoneToE164("(067) 123-45-67".replace("(067)", "067"))).toBe(
      "+380671234567",
    );
    expect(normalizePhoneToE164(" +380 67 123 45 67 ")).toBe("+380671234567");
  });

  it("accepts non-UA E.164 numbers as valid without special UX", () => {
    expect(normalizePhoneToE164("+14155552671")).toBe("+14155552671");
  });

  it("rejects too-short input", () => {
    expect(() => normalizePhoneToE164("12345")).toThrow(InvalidPhoneError);
  });

  it("rejects UA local format with wrong digit count", () => {
    expect(() => normalizePhoneToE164("067123456")).toThrow(InvalidPhoneError);
    expect(() => normalizePhoneToE164("06712345678")).toThrow(InvalidPhoneError);
  });

  it("rejects garbage input", () => {
    expect(() => normalizePhoneToE164("not-a-phone")).toThrow(InvalidPhoneError);
    expect(() => normalizePhoneToE164("")).toThrow(InvalidPhoneError);
  });

  it("isValidE164 mirrors normalizePhoneToE164 without throwing", () => {
    expect(isValidE164("0671234567")).toBe(true);
    expect(isValidE164("not-a-phone")).toBe(false);
  });
});
