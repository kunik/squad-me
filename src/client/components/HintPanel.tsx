import type { ReactNode } from "react";

type HintPanelProps = {
  progress?: string;
  children: ReactNode;
  tone?: "info" | "warning";
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
};

/**
 * Guided-flow hint rendered as a Gentelella `.banner` callout — used for
 * registration step progress, profile onboarding, and reauth prompts. Placed
 * by the shell/auth layout above page content (never inside page cards).
 */
export function HintPanel({
  progress,
  children,
  tone = "info",
  actionLabel,
  onAction,
  actionDisabled = false,
}: HintPanelProps) {
  return (
    <div
      className={`banner onboarding-banner${tone === "warning" ? " banner-warning" : ""}`}
      role="status"
      aria-live="polite"
    >
      <span className="banner-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5" strokeLinecap="round" />
          <circle cx="12" cy="7.5" r="0.6" fill="currentColor" />
        </svg>
      </span>
      <div className="banner-body">
        {progress && <span className="banner-progress">{progress}</span>}
        <span>{children}</span>
      </div>
      {actionLabel && onAction && (
        <div className="banner-actions">
          <button
            type="button"
            className="btn btn-sm btn-outline"
            disabled={actionDisabled}
            onClick={onAction}
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
