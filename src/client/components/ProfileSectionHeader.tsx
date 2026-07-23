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
      <div className="card-title">{title}</div>
      <div className="card-options">
        {editing
          ? onCancel && (
              <HeaderIconButton
                src="/icon-cancel.png"
                label={cancelLabel}
                disabled={busy}
                onClick={onCancel}
              />
            )
          : onEdit && (
              <HeaderIconButton
                src="/icon-edit.png"
                label={editLabel}
                onClick={onEdit}
              />
            )}
      </div>
    </div>
  );
}

function HeaderIconButton({
  src,
  label,
  disabled = false,
  onClick,
}: {
  src: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
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
      <img src={src} alt="" width={14} height={14} />
    </button>
  );
}
