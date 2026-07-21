import type { Messages } from "../i18n";
import type { ProfileNavSection } from "../hooks/useUnsavedDiscard";
import {
  ACTIONS_ANCHOR,
  DIVISIONS_ANCHOR,
  NOTIFICATIONS_ANCHOR,
  PROFILE_ANCHOR,
} from "../hooks/useProfileScrollSpy";

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

/** Personal profile (anchors for details / divisions / notifications / security). */
export const PROFILE_PATH = "/profile";

/**
 * Data-driven accordion groups for the account left nav.
 * Matches / Linked are own routes; profile keeps in-page hash children.
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
  {
    section: "profile",
    path: PROFILE_PATH,
    labelKey: "profileMenuMyProfile",
    children: [
      { id: PROFILE_ANCHOR, labelKey: "profileMenuPersonalDetails" },
      { id: DIVISIONS_ANCHOR, labelKey: "profileMenuDivisions" },
      { id: NOTIFICATIONS_ANCHOR, labelKey: "profileMenuNotifications" },
      { id: ACTIONS_ANCHOR, labelKey: "profileMenuActions" },
    ],
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

/** Default child to activate when selecting a group that scrolls in-page. */
export function defaultAnchorForMenuGroup(group: ProfileMenuGroup): string | null {
  return group.children[0]?.id ?? null;
}
