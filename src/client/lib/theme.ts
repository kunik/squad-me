/** Resolved theme applied to `html[data-theme]`. */
export type Theme = "light" | "dark";

/** User preference persisted in localStorage (may follow the OS). */
export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "theme";
const PREFERENCE_ORDER: ThemePreference[] = ["light", "dark", "system"];

const SYSTEM_MQ = "(prefers-color-scheme: dark)";

let systemListenerCleanup: (() => void) | null = null;

export function isThemePreference(value: string | null | undefined): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function getStoredThemePreference(): ThemePreference | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (isThemePreference(value)) return value;
  } catch {
    /* private mode */
  }
  return null;
}

/** @deprecated Prefer `getStoredThemePreference`. Returns only explicit light/dark. */
export function getStoredTheme(): Theme | null {
  const pref = getStoredThemePreference();
  return pref === "light" || pref === "dark" ? pref : null;
}

export function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia(SYSTEM_MQ).matches ? "dark" : "light";
}

/**
 * Resolve a preference to the theme that should be applied to the DOM.
 * Pass `systemTheme` in tests to avoid reading `matchMedia`.
 */
export function resolveTheme(
  preference: ThemePreference,
  systemTheme: Theme = getSystemTheme(),
): Theme {
  return preference === "system" ? systemTheme : preference;
}

/** Next preference in the light → dark → system cycle. */
export function nextThemePreference(current: ThemePreference): ThemePreference {
  const index = PREFERENCE_ORDER.indexOf(current);
  return PREFERENCE_ORDER[(index + 1) % PREFERENCE_ORDER.length]!;
}

/**
 * Effective theme for bootstrap: stored preference (default `system`) resolved
 * against `prefers-color-scheme` when needed.
 */
export function getPreferredTheme(): Theme {
  const stored = getStoredThemePreference();
  return resolveTheme(stored ?? "system");
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    // Keep in sync with CSS `--brand-black` / `--brand-floral` in styles.css.
    meta.setAttribute("content", theme === "dark" ? "#050609" : "#fef8ec");
  }
}

function stopSystemListener() {
  systemListenerCleanup?.();
  systemListenerCleanup = null;
}

function syncSystemListener(preference: ThemePreference) {
  stopSystemListener();
  if (preference !== "system" || typeof window === "undefined") return;

  const mq = window.matchMedia(SYSTEM_MQ);
  const onChange = () => {
    applyTheme(resolveTheme("system"));
  };
  mq.addEventListener("change", onChange);
  systemListenerCleanup = () => mq.removeEventListener("change", onChange);
}

/** Call once before React mount to avoid theme flash. */
export function initTheme() {
  const preference = getStoredThemePreference() ?? "system";
  applyTheme(resolveTheme(preference));
  syncSystemListener(preference);
}

/** Persist preference and apply the resolved theme. */
export function setThemePreference(preference: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    /* private mode */
  }
  applyTheme(resolveTheme(preference));
  syncSystemListener(preference);
}

/**
 * Persist and apply. Accepts a resolved theme or `system`.
 * Prefer `setThemePreference` when the intent is the stored preference.
 */
export function setTheme(theme: Theme | ThemePreference) {
  setThemePreference(theme);
}

/** Current preference, defaulting to `system` when unset. */
export function readThemePreference(): ThemePreference {
  return getStoredThemePreference() ?? "system";
}

/** Resolved theme currently on `<html>`. */
export function readTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/** Cycle light → dark → system → light. */
export function cycleThemePreference(): ThemePreference {
  const next = nextThemePreference(readThemePreference());
  setThemePreference(next);
  return next;
}

/** @deprecated Prefer `cycleThemePreference` (three-state). */
export function toggleTheme(): Theme {
  cycleThemePreference();
  return readTheme();
}

export function isDesktopShell(): boolean {
  return window.matchMedia("(min-width: 769px)").matches;
}
