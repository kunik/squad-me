import { describe, expect, it } from "vitest";
import {
  isProfileMenuGroupExpanded,
  LINKED_SHOOTERS_PATH,
  MATCHES_PATH,
  pathForProfileSection,
  postAuthLandingPath,
  PROFILE_IN_PAGE_NAV_ITEMS,
  PROFILE_MENU_GROUPS,
  PROFILE_PATH,
  profileInPageNavItems,
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

  it("keeps profile in-page nav in the aside without security", () => {
    expect(PROFILE_IN_PAGE_NAV_ITEMS.map((item) => item.id)).toEqual([
      "my-profile",
      "my-divisions",
      "my-notifications",
    ]);
    expect(profileInPageNavItems().map((item) => item.id)).toEqual([
      "my-profile",
      "my-divisions",
      "my-notifications",
    ]);
    expect(profileInPageNavItems({ showNotifications: false }).map((item) => item.id)).toEqual([
      "my-profile",
      "my-divisions",
    ]);
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
