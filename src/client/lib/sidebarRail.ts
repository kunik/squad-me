export const RAIL_KEY = "gentelella:sidebar-rail";

/** Wordmark fade/slide before width collapse (ms). */
export const SIDEBAR_WORDMARK_MS = 180;
/** Sidebar width transition (must match CSS `transition: width …`). */
export const SIDEBAR_WIDTH_MS = 220;

export function readSidebarRail(): boolean {
  try {
    return localStorage.getItem(RAIL_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSidebarRail(collapsed: boolean) {
  try {
    localStorage.setItem(RAIL_KEY, collapsed ? "1" : "0");
  } catch {
    /* private mode */
  }
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
