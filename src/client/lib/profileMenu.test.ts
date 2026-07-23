import { describe, expect, it } from "vitest";
import {
  isProfileMenuGroupExpanded,
  LINKED_SHOOTERS_PATH,
  MATCHES_PATH,
  pathForProfileSection,
  postAuthLandingPath,
  PROFILE_MENU_GROUPS,
  PROFILE_PATH,
  profileSectionFromPath,
} from "./profileMenu";

describe("profile side menu", () => {
  it("expands only the active top-level section", () => {
    expect(isProfileMenuGroupExpanded("matches", "profile")).toBe(false);
    expect(isProfileMenuGroupExpanded("linked", "matches")).toBe(false);
    expect(isProfileMenuGroupExpanded("matches", "matches")).toBe(true);
  });

  it("lists only routed screens in the sidebar (no profile tree)", () => {
    expect(PROFILE_MENU_GROUPS.map((g) => g.section)).toEqual(["matches", "linked"]);
    expect(PROFILE_MENU_GROUPS.map((g) => g.path)).toEqual([
      MATCHES_PATH,
      LINKED_SHOOTERS_PATH,
    ]);
    for (const group of PROFILE_MENU_GROUPS) {
      expect(group.children).toEqual([]);
    }
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

  it("uses plain /profile as the default profile entry (no #my-profile)", () => {
    expect(PROFILE_PATH).toBe("/profile");
    expect(PROFILE_PATH).not.toContain("#");
    expect(pathForProfileSection("profile")).toBe("/profile");
  });

  it("sends finished users to matches and onboarders to profile", () => {
    expect(postAuthLandingPath(null)).toBe(MATCHES_PATH);
    expect(postAuthLandingPath(undefined)).toBe(MATCHES_PATH);
    expect(postAuthLandingPath("profile")).toBe(PROFILE_PATH);
    expect(postAuthLandingPath("disciplines")).toBe(PROFILE_PATH);
    expect(postAuthLandingPath("email")).toBe(PROFILE_PATH);
  });
});
