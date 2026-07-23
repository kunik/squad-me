import type { ReactNode } from "react";
import { useLocale } from "../locale";

type CollapsibleToggleBlockProps = {
  enabled: boolean;
  label: string;
  description?: string;
  /** Interactive switch; omit for read-only summary (shows Так/Ні). */
  onEnabledChange?: (enabled: boolean) => void;
  children?: ReactNode;
};

/**
 * Membership / discipline enable block: Gentelella `.toggle-row` + `.toggle`
 * in edit mode; read-only view shows Так/Ні so the control is not clickable.
 *
 * Uses a `button[role=switch]` (not a checkbox), so it does **not** bubble
 * `HTMLFormElement` `change` — callers must call their dirty marker inside
 * `onEnabledChange`.
 */
export function CollapsibleToggleBlock({
  enabled,
  label,
  description,
  onEnabledChange,
  children,
}: CollapsibleToggleBlockProps) {
  const { t } = useLocale();
  const interactive = typeof onEnabledChange === "function";

  return (
    <fieldset
      className={`profile-form__block profile-form__panel${enabled ? " is-enabled" : ""}`}
    >
      <div className="toggle-row profile-form__toggle-header">
        <div>
          <div className="label">{label}</div>
          {description ? <div className="desc">{description}</div> : null}
        </div>
        {interactive ? (
          <button
            type="button"
            className={`toggle${enabled ? " on" : ""}`}
            role="switch"
            aria-checked={enabled}
            aria-label={label}
            onClick={() => onEnabledChange(!enabled)}
          />
        ) : (
          <strong className="profile-form__toggle-state">
            {enabled ? t.profileSummaryYes : t.profileSummaryNo}
          </strong>
        )}
      </div>
      {enabled && children ? (
        <div className="profile-form__toggle-body">{children}</div>
      ) : null}
    </fieldset>
  );
}
