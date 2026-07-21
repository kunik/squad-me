import { describe, expect, it } from "vitest";
import {
  defaultAnchorForMenuGroup,
  isProfileMenuGroupExpanded,
  LINKED_SHOOTERS_PATH,
  MATCHES_PATH,
  pathForProfileSection,
  postAuthLandingPath,
  PROFILE_MENU_GROUPS,
  PROFILE_PATH,
  profileSectionFromPath,
} from "./profileMenu";

describe("profile side menu accordion", () => {
  it("expands only the active top-level section", () => {
    expect(isProfileMenuGroupExpanded("profile", "profile")).toBe(true);
    expect(isProfileMenuGroupExpanded("matches", "profile")).toBe(false);
    expect(isProfileMenuGroupExpanded("linked", "matches")).toBe(false);
    expect(isProfileMenuGroupExpanded("matches", "matches")).toBe(true);
  });

  it("keeps profile expanded while any profile sub-anchor is active (section stays profile)", () => {
    expect(isProfileMenuGroupExpanded("profile", "profile")).toBe(true);
    const profileGroup = PROFILE_MENU_GROUPS.find((g) => g.section === "profile");
    expect(profileGroup?.children.map((c) => c.id)).toEqual([
      "my-profile",
      "my-divisions",
      "my-notifications",
      "profile-actions",
    ]);
  });

  it("structures every top-level screen as a routed group that can gain children later", () => {
    expect(PROFILE_MENU_GROUPS.map((g) => g.section)).toEqual([
      "matches",
      "linked",
      "profile",
    ]);
    expect(PROFILE_MENU_GROUPS.map((g) => g.path)).toEqual([
      MATCHES_PATH,
      LINKED_SHOOTERS_PATH,
      PROFILE_PATH,
    ]);
    for (const group of PROFILE_MENU_GROUPS) {
      expect(Array.isArray(group.children)).toBe(true);
    }
    expect(PROFILE_MENU_GROUPS.find((g) => g.section === "matches")?.children).toEqual([]);
    expect(PROFILE_MENU_GROUPS.find((g) => g.section === "linked")?.children).toEqual([]);
  });

  it("defaults parent click to the first child anchor when present", () => {
    const profile = PROFILE_MENU_GROUPS.find((g) => g.section === "profile")!;
    const matches = PROFILE_MENU_GROUPS.find((g) => g.section === "matches")!;
    expect(defaultAnchorForMenuGroup(profile)).toBe("my-profile");
    expect(defaultAnchorForMenuGroup(matches)).toBeNull();
  });

  it("maps pathnames to top-level sections and back", () => {
    expect(profileSectionFromPath("/matches")).toBe("matches");
    expect(profileSectionFromPath("/linked-shooters")).toBe("linked");
    expect(profileSectionFromPath("/profile")).toBe("profile");
    expect(profileSectionFromPath("/profile#my-divisions")).toBe("profile");
    expect(pathForProfileSection("matches")).toBe(MATCHES_PATH);
    expect(pathForProfileSection("linked")).toBe(LINKED_SHOOTERS_PATH);
    expect(pathForProfileSection("profile")).toBe(PROFILE_PATH);
  });

  it("sends finished users to matches and onboarders to profile", () => {
    expect(postAuthLandingPath(null)).toBe(MATCHES_PATH);
    expect(postAuthLandingPath(undefined)).toBe(MATCHES_PATH);
    expect(postAuthLandingPath("profile")).toBe(PROFILE_PATH);
    expect(postAuthLandingPath("disciplines")).toBe(PROFILE_PATH);
    expect(postAuthLandingPath("email")).toBe(PROFILE_PATH);
  });
});
