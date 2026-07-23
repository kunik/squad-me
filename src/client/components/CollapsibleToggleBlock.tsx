import type { ReactNode } from "react";

type CollapsibleToggleBlockProps = {
  enabled: boolean;
  label: string;
  description?: string;
  /** Interactive switch; omit for read-only summary. */
  onEnabledChange?: (enabled: boolean) => void;
  children?: ReactNode;
};

/**
 * Membership / discipline enable block: Gentelella `.toggle-row` + `.toggle`
 * switch, with optional nested body when on.
 */
export function CollapsibleToggleBlock({
  enabled,
  label,
  description,
  onEnabledChange,
  children,
}: CollapsibleToggleBlockProps) {
  const interactive = typeof onEnabledChange === "function";

  return (
    <fieldset
      className={`profile-form__block profile-form__toggle-block${enabled ? " is-enabled" : ""}`}
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
          <span
            className={`toggle${enabled ? " on" : ""}`}
            role="switch"
            aria-checked={enabled}
            aria-disabled="true"
            aria-label={label}
          />
        )}
      </div>
      {enabled && children ? (
        <div className="profile-form__toggle-body">{children}</div>
      ) : null}
    </fieldset>
  );
}
