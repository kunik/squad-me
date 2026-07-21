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
 * Shared «панель підказки» (hint panel) for guided flows. Rendered inside
 * `PublicChrome`'s fixed hint slot — a narrow top-attached rectangle
 * (flush top, real `--panel-radius` on bottom corners) in the header band
 * (registration steps, profile onboarding hints, later match-reserve) —
 * not inside page cards.
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
    <div className={`hint-panel hint-panel--${tone}`} role="status" aria-live="polite">
      <div className="hint-panel__face">
        {progress && <strong className="hint-panel__progress">{progress}</strong>}
        <span className="hint-panel__message">{children}</span>
        {actionLabel && onAction && (
          <button
            type="button"
            className="btn btn--ghost hint-panel__action"
            disabled={actionDisabled}
            onClick={onAction}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
