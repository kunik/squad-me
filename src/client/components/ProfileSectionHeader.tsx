import type { ReactNode } from "react";

type ProfileSectionHeaderProps = {
  title: string;
  editing: boolean;
  editLabel: string;
  cancelLabel: string;
  busy?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
};

/**
 * Gentelella `.card-header` for `/profile` view ↔ edit. Title stays put;
 * only the trailing action swaps Edit → Cancel.
 */
export function ProfileSectionHeader({
  title,
  editing,
  editLabel,
  cancelLabel,
  busy = false,
  onEdit,
  onCancel,
}: ProfileSectionHeaderProps) {
  return (
    <div className="card-header">
      <h2 className="card-title">{title}</h2>
      <div className="card-options">
        {editing
          ? onCancel && (
              <HeaderIconButton label={cancelLabel} disabled={busy} onClick={onCancel}>
                <CancelIcon />
              </HeaderIconButton>
            )
          : onEdit && (
              <HeaderIconButton label={editLabel} onClick={onEdit}>
                <EditIcon />
              </HeaderIconButton>
            )}
      </div>
    </div>
  );
}

function HeaderIconButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="card-opt-btn"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18 6 6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
