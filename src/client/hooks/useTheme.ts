import { useCallback, useEffect, useState } from "react";
import { readTheme, setTheme, type Theme } from "../lib/theme";

/** Syncs Gentelella `data-theme` on `<html>` with React state. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof document === "undefined" ? "dark" : readTheme(),
  );

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setThemeState(readTheme());
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const toggle = useCallback(() => {
    const next = readTheme() === "dark" ? "light" : "dark";
    setTheme(next);
    setThemeState(next);
  }, []);

  return { theme, isDark: theme === "dark", setTheme, toggle };
}
