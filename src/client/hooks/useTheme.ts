import { useCallback, useEffect, useState } from "react";
import {
  cycleThemePreference,
  readTheme,
  readThemePreference,
  setThemePreference,
  type Theme,
  type ThemePreference,
} from "../lib/theme";

/** Syncs Gentelella `data-theme` on `<html>` with React state (incl. system). */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof document === "undefined" ? "dark" : readTheme(),
  );
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    typeof window === "undefined" ? "system" : readThemePreference(),
  );

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setThemeState(readTheme());
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (preference !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setThemeState(readTheme());
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setThemePreference(next);
    setPreferenceState(next);
    setThemeState(readTheme());
  }, []);

  const toggle = useCallback(() => {
    const next = cycleThemePreference();
    setPreferenceState(next);
    setThemeState(readTheme());
  }, []);

  return {
    theme,
    preference,
    isDark: theme === "dark",
    setTheme: setPreference,
    setPreference,
    toggle,
  };
}
