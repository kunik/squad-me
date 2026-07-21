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
 * Stable section chrome for `/profile` view ↔ edit. Title text/style stay
 * put; only the trailing action swaps Edit → Cancel.
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
    <div className="profile-summary__header">
      <h2 className="profile-summary__title">{title}</h2>
      {editing
        ? onCancel && (
            <HeaderIconButton
              className="profile-summary__cancel"
              iconClassName="profile-summary__cancel-icon"
              src="/icon-cancel.png"
              label={cancelLabel}
              disabled={busy}
              onClick={onCancel}
            />
          )
        : onEdit && (
            <HeaderIconButton
              className="profile-summary__edit"
              iconClassName="profile-summary__edit-icon"
              src="/icon-edit.png"
              label={editLabel}
              onClick={onEdit}
            />
          )}
    </div>
  );
}

function HeaderIconButton({
  className,
  iconClassName,
  src,
  label,
  disabled = false,
  onClick,
}: {
  className: string;
  iconClassName: string;
  src: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`btn btn--ghost ${className}`}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <img className={iconClassName} src={src} alt="" />
    </button>
  );
}
