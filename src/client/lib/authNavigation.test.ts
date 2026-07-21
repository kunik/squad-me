import { describe, expect, it } from "vitest";
import { AUTHENTICATED_HOME_PATH, safeNextPath } from "./authApi";
import { MATCHES_PATH, postAuthLandingPath, PROFILE_PATH } from "./profileMenu";

describe("authenticated home / safeNextPath", () => {
  it("uses /matches as the signed-in home", () => {
    expect(AUTHENTICATED_HOME_PATH).toBe(MATCHES_PATH);
    expect(AUTHENTICATED_HOME_PATH).toBe("/matches");
  });

  it("falls back to authenticated home when next is missing or unsafe", () => {
    expect(safeNextPath(null)).toBe(AUTHENTICATED_HOME_PATH);
    expect(safeNextPath("")).toBe(AUTHENTICATED_HOME_PATH);
    expect(safeNextPath("https://evil.example")).toBe(AUTHENTICATED_HOME_PATH);
    expect(safeNextPath("//evil.example")).toBe(AUTHENTICATED_HOME_PATH);
    expect(safeNextPath("profile")).toBe(AUTHENTICATED_HOME_PATH);
  });

  it("allows same-origin relative next paths", () => {
    expect(safeNextPath("/profile")).toBe("/profile");
    expect(safeNextPath("/matches")).toBe("/matches");
    expect(safeNextPath("/change-phone")).toBe("/change-phone");
    expect(safeNextPath("/linked-shooters?x=1")).toBe("/linked-shooters?x=1");
  });

  it("AUTH-002: rejects / and guest auth entry paths that would Navigate-loop", () => {
    expect(safeNextPath("/")).toBe(AUTHENTICATED_HOME_PATH);
    expect(safeNextPath("/login")).toBe(AUTHENTICATED_HOME_PATH);
    expect(safeNextPath("/login?next=%2Fmatches")).toBe(AUTHENTICATED_HOME_PATH);
    expect(safeNextPath("/register")).toBe(AUTHENTICATED_HOME_PATH);
    expect(safeNextPath("/forgot-password")).toBe(AUTHENTICATED_HOME_PATH);
  });

  it("keeps onboarding landings on /profile and never lands authed home on /", () => {
    expect(postAuthLandingPath("profile")).toBe(PROFILE_PATH);
    expect(postAuthLandingPath("disciplines")).toBe(PROFILE_PATH);
    expect(postAuthLandingPath(null)).toBe(MATCHES_PATH);
    expect(postAuthLandingPath(null)).not.toBe("/");
    expect(MATCHES_PATH).not.toBe("/");
  });
});
