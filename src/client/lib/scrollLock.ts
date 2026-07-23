/** CSS custom property set to the layout gap from removing the viewport scrollbar. */
export const REMOVED_SCROLLBAR_WIDTH_VAR = "--removed-scrollbar-width";

/**
 * Layout gap (px) introduced when scroll lock removes a classic scrollbar.
 * Zero when `scrollbar-gutter: stable` already reserved space (or overlay
 * scrollbars never took layout width).
 */
export function scrollbarLockGap(widthBefore: number, widthAfter: number): number {
  return Math.max(0, widthAfter - widthBefore);
}

/**
 * Locks body scroll via `sidebar-open` (see gentelella `overflow: hidden`) and
 * compensates for classic scrollbar disappearance.
 *
 * Measures `documentElement.clientWidth` before vs after adding the class so
 * browsers that already honor `scrollbar-gutter: stable` get gap `0` (no
 * double padding), while Safari/macOS overlay-or-ignored-gutter cases still
 * get `padding-right` / fixed topbar inset via the CSS variable.
 *
 * @returns cleanup that removes the class and the CSS variable
 */
export function applySidebarScrollLock(): () => void {
  const body = document.body;
  const root = document.documentElement;
  const widthBefore = root.clientWidth;

  body.classList.add("sidebar-open");

  const gap = scrollbarLockGap(widthBefore, root.clientWidth);
  if (gap > 0) {
    root.style.setProperty(REMOVED_SCROLLBAR_WIDTH_VAR, `${gap}px`);
  }

  return () => {
    body.classList.remove("sidebar-open");
    root.style.removeProperty(REMOVED_SCROLLBAR_WIDTH_VAR);
  };
}
