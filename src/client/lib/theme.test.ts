import { describe, expect, it } from "vitest";
import {
  isThemePreference,
  nextThemePreference,
  resolveTheme,
} from "./theme";

describe("theme preference", () => {
  it("accepts light, dark, and system as stored preferences", () => {
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("system")).toBe(true);
    expect(isThemePreference("auto")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });

  it("resolves system preference from the provided OS theme", () => {
    expect(resolveTheme("system", "dark")).toBe("dark");
    expect(resolveTheme("system", "light")).toBe("light");
  });

  it("resolves explicit light/dark without using the OS theme", () => {
    expect(resolveTheme("light", "dark")).toBe("light");
    expect(resolveTheme("dark", "light")).toBe("dark");
  });

  it("cycles light → dark → system → light", () => {
    expect(nextThemePreference("light")).toBe("dark");
    expect(nextThemePreference("dark")).toBe("system");
    expect(nextThemePreference("system")).toBe("light");
  });

  // readThemePreference / initTheme / getPreferredTheme use `stored ?? "system"`.
  it("uses system as the unset preference when resolving against OS theme", () => {
    const unsetDefault = "system" as const;
    expect(resolveTheme(unsetDefault, "light")).toBe("light");
    expect(resolveTheme(unsetDefault, "dark")).toBe("dark");
  });
});
