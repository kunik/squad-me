export function ProfileFormActions({
  busy,
  submitLabel,
  cancelLabel,
  onCancel,
}: {
  busy: boolean;
  submitLabel: string;
  cancelLabel: string;
  onCancel?: () => void;
}) {
  return (
    <div className="form-actions right">
      {onCancel && (
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={onCancel}>
          {cancelLabel}
        </button>
      )}
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {submitLabel}
      </button>
    </div>
  );
}
