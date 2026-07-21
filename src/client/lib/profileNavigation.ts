import { createElement, type ReactNode } from "react";

export type ProfileAnchorPosition<T extends string> = {
  id: T;
  top: number;
};

/**
 * Comfort gap below fixed top chrome (or the viewport top when nothing is
 * pinned). Matches `.profile-page__anchor { scroll-margin-top: 1.5rem }` at the
 * default root font size. Previously 5rem / 80px, which left headings too far
 * down after a menu scroll when header/hint were not pinned.
 */
export const PROFILE_ANCHOR_COMFORT_PAD_PX = 24;

/** @deprecated Prefer PROFILE_ANCHOR_COMFORT_PAD_PX — kept as the default margin alias. */
export const PROFILE_ANCHOR_SCROLL_MARGIN_PX = PROFILE_ANCHOR_COMFORT_PAD_PX;

/**
 * Left-nav menu item activated when profile onboarding advances to the
 * disciplines step (Skip or Save). Same target as clicking «Дивізіони».
 */
export const PROFILE_TO_DISCIPLINES_MENU_ANCHOR = "my-divisions" as const;

/**
 * Left-nav menu item activated when disciplines onboarding advances to the
 * email step (Skip or Save). Same target as clicking «Сповіщення».
 */
export const PROFILE_TO_EMAIL_MENU_ANCHOR = "my-notifications" as const;

/**
 * @deprecated Prefer {@link PROFILE_TO_EMAIL_MENU_ANCHOR} (or
 * {@link PROFILE_TO_DISCIPLINES_MENU_ANCHOR} for the profile→disciplines advance).
 */
export const PROFILE_STEP_ADVANCE_MENU_ANCHOR = PROFILE_TO_EMAIL_MENU_ANCHOR;

/** Selector for fixed App Shell top chrome (header + optional HintPanel). */
export const PROFILE_STICKY_CHROME_SELECTORS = [".app-top-chrome"] as const;

export function ProfileContentSection({
  id,
  className = "",
  ariaLabelledby,
  children,
}: {
  id: string;
  className?: string;
  ariaLabelledby?: string;
  children?: ReactNode;
}) {
  return createElement(
    "section",
    {
      id,
      className: `profile-page__block profile-page__anchor${className ? ` ${className}` : ""}`,
      "aria-labelledby": ariaLabelledby,
    },
    children,
  );
}

/**
 * Bottom edge (px from viewport top) of sticky/fixed top chrome that still
 * covers the viewport. Non-pinned header/banner that scroll away are ignored
 * so menu scroll does not reserve space for chrome that will not be present.
 * Stacked sticky/fixed layers (header + hint panel) accumulate when they abut.
 * Measures the `.app-top-chrome` layout box (header + optional «панель підказки»).
 */
export function stickyTopChromeBottomPx(
  elements: ReadonlyArray<{ position: string; top: number; bottom: number }>,
): number {
  let bottom = 0;
  const sticky = elements
    .filter(
      (el) =>
        (el.position === "sticky" || el.position === "fixed") &&
        el.bottom > el.top &&
        el.bottom > 0,
    )
    .slice()
    .sort((a, b) => a.top - b.top);
  for (const el of sticky) {
    if (el.top <= bottom + 48) {
      bottom = Math.max(bottom, el.bottom);
    }
  }
  return bottom;
}

/** Live DOM measurement for {@link stickyTopChromeBottomPx}. */
export function readStickyTopChromeBottom(
  root: ParentNode = document,
  getStyle: (el: Element) => { position: string } = (el) => getComputedStyle(el),
): number {
  const measured: { position: string; top: number; bottom: number }[] = [];
  for (const selector of PROFILE_STICKY_CHROME_SELECTORS) {
    const el = root.querySelector(selector);
    if (!el || !(el instanceof Element)) continue;
    const rect = el.getBoundingClientRect();
    measured.push({
      position: getStyle(el).position,
      top: rect.top,
      bottom: rect.bottom,
    });
  }
  return stickyTopChromeBottomPx(measured);
}

/** Desired heading offset from the viewport top after a menu / hash scroll. */
export function profileAnchorOffsetPx(
  stickyChromeBottomPx: number,
  comfortPadPx: number = PROFILE_ANCHOR_COMFORT_PAD_PX,
): number {
  return Math.max(comfortPadPx, Math.max(0, stickyChromeBottomPx) + comfortPadPx);
}

/**
 * Scroll-spy reading line — same near-chrome band as menu/hash click landing
 * ({@link profileAnchorOffsetPx}). Active section = last anchor whose top has
 * crossed at or above this line (PROFILE-004). Do not use a mid-viewport line:
 * short/mid sections never uniquely own it and get skipped (e.g. divisions
 * between profile and notifications).
 */
export function profileReadingLinePx(
  stickyChromeBottomPx: number,
  comfortPadPx: number = PROFILE_ANCHOR_COMFORT_PAD_PX,
): number {
  return profileAnchorOffsetPx(stickyChromeBottomPx, comfortPadPx);
}

/**
 * Window `scrollY` that places an anchor at the viewport top minus scroll-margin.
 * Prefer this over `Element.scrollIntoView`: ancestors with `overflow: hidden`
 * (e.g. `.public-surface`) are scroll containers, and scrollIntoView can shift
 * them so the site header scrolls out of reach while `window.scrollY` stays ~0.
 */
export function windowScrollTopForAnchor(
  targetTop: number,
  currentScrollY: number,
  scrollMarginPx: number = PROFILE_ANCHOR_SCROLL_MARGIN_PX,
): number {
  return Math.max(0, currentScrollY + targetTop - scrollMarginPx);
}

/**
 * Resolves the scroll-spy anchor. Menu-click authority wins while its scroll
 * settles; otherwise the page-start boundary wins over the document-end
 * fallback when a short page satisfies both conditions.
 */
export function resolveActiveProfileAnchor<T extends string>(
  anchors: readonly ProfileAnchorPosition<T>[],
  readingLine: number,
  atDocumentStart: boolean,
  atDocumentEnd: boolean,
  programmaticTarget: T | null,
): T {
  if (anchors.length === 0) {
    throw new Error("At least one profile anchor is required");
  }
  if (programmaticTarget && anchors.some(({ id }) => id === programmaticTarget)) {
    return programmaticTarget;
  }
  if (atDocumentStart) {
    return anchors[0].id;
  }
  let next = anchors[0].id;
  for (const anchor of anchors) {
    if (anchor.top <= readingLine) {
      next = anchor.id;
    } else {
      break;
    }
  }
  return atDocumentEnd ? anchors[anchors.length - 1].id : next;
}
