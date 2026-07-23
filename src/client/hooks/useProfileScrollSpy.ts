import {
  PROFILE_TO_DISCIPLINES_MENU_ANCHOR,
  PROFILE_TO_EMAIL_MENU_ANCHOR,
  profileAnchorOffsetPx,
  profileReadingLinePx,
  readStickyTopChromeBottom,
  resolveActiveProfileAnchor,
  windowScrollTopForAnchor,
} from "../lib/profileNavigation";
import { useEffect, useRef, useState } from "react";

export const PROFILE_ANCHOR = "my-profile";
export const DIVISIONS_ANCHOR = PROFILE_TO_DISCIPLINES_MENU_ANCHOR;
export const NOTIFICATIONS_ANCHOR = PROFILE_TO_EMAIL_MENU_ANCHOR;

/** @deprecated Security actions are not a scroll-spy target (aside card only). */
export const ACTIONS_ANCHOR = "profile-actions";

export type ProfileAnchor =
  | typeof PROFILE_ANCHOR
  | typeof DIVISIONS_ANCHOR
  | typeof NOTIFICATIONS_ANCHOR;

/** Main-column profile sections only — aside actions are out of the spy set. */
export const PROFILE_ANCHORS: readonly ProfileAnchor[] = [
  PROFILE_ANCHOR,
  DIVISIONS_ANCHOR,
  NOTIFICATIONS_ANCHOR,
];

type UseProfileScrollSpyOptions = {
  loadingProfile: boolean;
  showNotifications: boolean;
  showProfileEditor: boolean;
  editingDivisions: boolean;
  editingNotifications: boolean;
  onboardingStep: string | null | undefined;
};

/**
 * Window scroll-spy + programmatic anchor scroll for `/profile` section hashes.
 * Used for onboarding Skip/Save scroll and intentional deep links
 * (e.g. `#my-divisions`, `#my-notifications`). Default profile entry is plain
 * `/profile` (no `#my-profile`).
 * Logic preserved from ProfilePage (PROFILE-002/004 regressions).
 */
export function useProfileScrollSpy({
  loadingProfile,
  showNotifications,
  showProfileEditor,
  editingDivisions,
  editingNotifications,
  onboardingStep,
}: UseProfileScrollSpyOptions) {
  const [activeAnchor, setActiveAnchor] = useState<ProfileAnchor>(PROFILE_ANCHOR);
  const initialHashHandled = useRef(false);
  const pendingAnchor = useRef<ProfileAnchor | null>(null);
  const programmaticAnchor = useRef<ProfileAnchor | null>(null);
  const programmaticReleaseTimer = useRef<number | null>(null);

  function performPendingAnchorScroll() {
    const id = pendingAnchor.current;
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;

    pendingAnchor.current = null;
    programmaticAnchor.current = id;
    setActiveAnchor(id);
    const scrollBefore = window.scrollY;
    const margin = profileAnchorOffsetPx(readStickyTopChromeBottom());
    const top = windowScrollTopForAnchor(
      target.getBoundingClientRect().top,
      scrollBefore,
      margin,
    );
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduceMotion ? "auto" : "smooth" });
    if (programmaticReleaseTimer.current !== null) {
      window.clearTimeout(programmaticReleaseTimer.current);
    }
    programmaticReleaseTimer.current = window.setTimeout(() => {
      if (programmaticAnchor.current === id) programmaticAnchor.current = null;
      programmaticReleaseTimer.current = null;
    }, 800);
    window.setTimeout(() => {
      if (
        programmaticAnchor.current === id &&
        Math.abs(window.scrollY - scrollBefore) < 1 &&
        target.getBoundingClientRect().top > window.innerHeight / 2
      ) {
        window.scrollTo({
          top: windowScrollTopForAnchor(
            target.getBoundingClientRect().top,
            window.scrollY,
            profileAnchorOffsetPx(readStickyTopChromeBottom()),
          ),
        });
      }
    }, 120);
  }

  function scrollToAnchor(id: string) {
    if (!PROFILE_ANCHORS.includes(id as ProfileAnchor)) return;
    const anchor = id as ProfileAnchor;
    pendingAnchor.current = anchor;
    setActiveAnchor(anchor);
    window.history.replaceState(window.history.state, "", `#${id}`);
    window.setTimeout(performPendingAnchorScroll, 0);
  }

  useEffect(() => {
    return () => {
      if (programmaticReleaseTimer.current !== null) {
        window.clearTimeout(programmaticReleaseTimer.current);
      }
      programmaticReleaseTimer.current = null;
      programmaticAnchor.current = null;
    };
  }, []);

  // Activate «Дивізіони» only after the divisions *edit* form is open.
  useEffect(() => {
    if (onboardingStep !== "disciplines" || loadingProfile || !editingDivisions) {
      return;
    }
    const timer = window.setTimeout(() => {
      requestAnimationFrame(() => scrollToAnchor(DIVISIONS_ANCHOR));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [onboardingStep, loadingProfile, editingDivisions]);

  // Same for «Сповіщення» during the email onboarding step.
  useEffect(() => {
    if (onboardingStep !== "email" || loadingProfile || !editingNotifications) {
      return;
    }
    const timer = window.setTimeout(() => {
      requestAnimationFrame(() => scrollToAnchor(NOTIFICATIONS_ANCHOR));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [onboardingStep, loadingProfile, editingNotifications]);

  useEffect(() => {
    if (loadingProfile) return;
    const elements = PROFILE_ANCHORS.map((id) => document.getElementById(id)).filter(
      (element): element is HTMLElement => element !== null,
    );
    if (elements.length === 0) return;

    const update = () => {
      const nextY = window.scrollY;
      const readingLine = profileReadingLinePx(readStickyTopChromeBottom());
      const next = resolveActiveProfileAnchor(
        elements.map((element) => ({
          id: element.id as ProfileAnchor,
          top: element.getBoundingClientRect().top,
        })),
        readingLine,
        nextY <= 2,
        nextY + window.innerHeight >= document.documentElement.scrollHeight - 2,
        programmaticAnchor.current,
      );
      setActiveAnchor((current) => (current === next ? current : next));
    };

    if (!initialHashHandled.current) {
      initialHashHandled.current = true;
      const hash = window.location.hash.slice(1) as ProfileAnchor;
      if (PROFILE_ANCHORS.includes(hash)) {
        pendingAnchor.current = hash;
      }
    }

    performPendingAnchorScroll();
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [
    loadingProfile,
    showNotifications,
    showProfileEditor,
    editingDivisions,
    editingNotifications,
  ]);

  useEffect(() => {
    if (loadingProfile) return;
    const nextHash = `#${activeAnchor}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState(window.history.state, "", nextHash);
    }
  }, [activeAnchor, loadingProfile]);

  return { activeAnchor, scrollToAnchor };
}
