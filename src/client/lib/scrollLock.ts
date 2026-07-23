/** Body class for overflow lock + scrollbar-gap compensation (see styles.css). */
export const BODY_SCROLL_LOCK_CLASS = "scroll-locked";

/** CSS custom property set to the layout gap from removing the viewport scrollbar. */
export const REMOVED_SCROLLBAR_WIDTH_VAR = "--removed-scrollbar-width";

let activeLocks = 0;

/**
 * Layout gap (px) introduced when scroll lock removes a classic scrollbar.
 * Zero when `scrollbar-gutter: stable` already reserved space (or overlay
 * scrollbars never took layout width).
 */
export function scrollbarLockGap(widthBefore: number, widthAfter: number): number {
  return Math.max(0, widthAfter - widthBefore);
}

/**
 * Locks body scroll and compensates for classic scrollbar disappearance.
 *
 * Measures `documentElement.clientWidth` before vs after the first active lock
 * so browsers that already honor `scrollbar-gutter: stable` get gap `0` (no
 * double padding), while Safari/macOS overlay-or-ignored-gutter cases still
 * get `padding-right` / fixed topbar inset via the CSS variable.
 *
 * Nested locks (e.g. modal while drawer open) share one gap measurement;
 * the CSS variable clears only when the last lock releases.
 *
 * @returns cleanup that releases this lock (and clears the CSS variable if last)
 */
export function applyBodyScrollLock(): () => void {
  const body = document.body;
  const root = document.documentElement;

  if (activeLocks === 0) {
    const widthBefore = root.clientWidth;
    body.classList.add(BODY_SCROLL_LOCK_CLASS);
    const gap = scrollbarLockGap(widthBefore, root.clientWidth);
    if (gap > 0) {
      root.style.setProperty(REMOVED_SCROLLBAR_WIDTH_VAR, `${gap}px`);
    }
  }
  activeLocks += 1;

  return () => {
    activeLocks = Math.max(0, activeLocks - 1);
    if (activeLocks === 0) {
      body.classList.remove(BODY_SCROLL_LOCK_CLASS);
      root.style.removeProperty(REMOVED_SCROLLBAR_WIDTH_VAR);
    }
  };
}
