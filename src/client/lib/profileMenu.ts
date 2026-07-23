import type { Messages } from "../i18n";
import type { ProfileNavSection } from "../hooks/useUnsavedDiscard";

/** In-page (or future section-local) nav child under a top-level screen group. */
export type ProfileMenuChild = {
  id: string;
  labelKey: keyof Messages;
};

/** Top-level account-area nav screen; may grow children over time. */
export type ProfileMenuGroup = {
  section: ProfileNavSection;
  path: string;
  labelKey: keyof Messages;
  children: readonly ProfileMenuChild[];
};

/** Bookmarkable authenticated home — «Мої матчі». */
export const MATCHES_PATH = "/matches";

/** «Пов’язані стрільці». */
export const LINKED_SHOOTERS_PATH = "/linked-shooters";

/** Personal profile (section anchors still used for hash deep links / onboarding). */
export const PROFILE_PATH = "/profile";

/**
 * Data-driven sidebar groups: routed screens only.
 * Profile is reached via the sidebar footer avatar link.
 */
export const PROFILE_MENU_GROUPS: readonly ProfileMenuGroup[] = [
  {
    section: "matches",
    path: MATCHES_PATH,
    labelKey: "profileMenuMatches",
    children: [],
  },
  {
    section: "linked",
    path: LINKED_SHOOTERS_PATH,
    labelKey: "profileMenuLinkedShooters",
    children: [],
  },
];

/** Accordion rule: expand only the group whose section matches the active screen. */
export function isProfileMenuGroupExpanded(
  groupSection: ProfileNavSection,
  activeSection: ProfileNavSection,
): boolean {
  return groupSection === activeSection;
}

/** Map the current pathname to the active left-nav section. */
export function profileSectionFromPath(pathname: string): ProfileNavSection {
  if (pathname === MATCHES_PATH || pathname.startsWith(`${MATCHES_PATH}/`)) {
    return "matches";
  }
  if (pathname === LINKED_SHOOTERS_PATH || pathname.startsWith(`${LINKED_SHOOTERS_PATH}/`)) {
    return "linked";
  }
  return "profile";
}

/** Route for a top-level account-area section. */
export function pathForProfileSection(section: ProfileNavSection): string {
  if (section === "profile") {
    return PROFILE_PATH;
  }
  const group = PROFILE_MENU_GROUPS.find((g) => g.section === section);
  return group?.path ?? PROFILE_PATH;
}

/**
 * Where to send a signed-in user after auth: onboarding stays on `/profile`;
 * otherwise matches home.
 */
export function postAuthLandingPath(onboardingStep: string | null | undefined): string {
  return onboardingStep ? PROFILE_PATH : MATCHES_PATH;
}
