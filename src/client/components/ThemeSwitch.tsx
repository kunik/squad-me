import { useLocale } from "../locale";
import { useTheme } from "../hooks/useTheme";

type ThemeSwitchProps = {
  className?: string;
  compact?: boolean;
  /** Tooltip label when sidebar is in icons-only rail mode. */
  "data-rail-label"?: string;
};

/** Gentelella `.theme-toggle` — swaps `html[data-theme]` light/dark. */
export function ThemeSwitch({
  className = "",
  compact = false,
  "data-rail-label": railLabel,
}: ThemeSwitchProps) {
  const { t } = useLocale();
  const { isDark, toggle } = useTheme();
  const tip = railLabel ?? t.themeToggleLabel;

  return (
    <button
      type="button"
      className={`tb-btn theme-toggle${compact ? " theme-toggle--compact" : ""}${className ? ` ${className}` : ""}`}
      title={tip}
      aria-label={tip}
      aria-pressed={isDark}
      data-rail-label={railLabel}
      onClick={toggle}
    >
      <svg
        className="theme-icon-light"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
      <svg
        className="theme-icon-dark"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      {!compact && <span className="theme-toggle-label">{isDark ? t.themeDark : t.themeLight}</span>}
    </button>
  );
}
