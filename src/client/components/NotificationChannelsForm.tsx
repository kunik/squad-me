import { useEffect, useState, type FormEvent } from "react";
import { useLocale } from "../locale";

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type NotificationChannelsFormProps = {
  submitting: boolean;
  serverError: string | null;
  /** Prefill / show existing account email. */
  initialEmail?: string | null;
  /**
   * Persist email via `POST /api/auth/account/email` (collection only; no OTP yet).
   * Return `true` when saved so the UI can exit edit mode.
   */
  onSaveEmail: (email: string) => boolean | Promise<boolean>;
  onDirtyChange?: (dirty: boolean) => void;
  onCancel?: () => void;
  /**
   * Called after a successful section Save (email persisted when needed).
   * Parent exits edit mode / clears dirty.
   */
  onSaved?: () => void | Promise<void>;
};

type NotificationChannelsSummaryProps = {
  email: string | null | undefined;
  phoneE164: string;
};

/**
 * Edit form for `/profile` «Мої сповіщення». Email collection + Save only until
 * OTP/Telegram APIs exist. Title + Edit/Cancel live in `ProfileSectionHeader`.
 */
export function NotificationChannelsForm({
  submitting,
  serverError,
  initialEmail = null,
  onSaveEmail,
  onDirtyChange,
  onCancel,
  onSaved,
}: NotificationChannelsFormProps) {
  const { t } = useLocale();

  const baselineEmail = (initialEmail ?? "").trim().toLowerCase();

  const [email, setEmail] = useState(initialEmail ?? "");
  const [emailClientError, setEmailClientError] = useState<string | null>(null);

  useEffect(() => {
    setEmail(initialEmail ?? "");
    setEmailClientError(null);
  }, [initialEmail]);

  function syncDirty(nextEmail: string) {
    const trimmed = nextEmail.trim().toLowerCase();
    onDirtyChange?.(trimmed !== baselineEmail);
  }

  async function persistEmailIfNeeded(raw: string): Promise<boolean> {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) {
      setEmailClientError(t.commChannelsEmailRequired);
      return false;
    }
    if (trimmed.length > 254 || !SIMPLE_EMAIL_RE.test(trimmed)) {
      setEmailClientError(t.authErrorInvalidEmail);
      return false;
    }
    if (trimmed === baselineEmail) {
      setEmail(trimmed);
      return true;
    }
    const saved = await onSaveEmail(trimmed);
    if (!saved) return false;
    setEmail(trimmed);
    return true;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailClientError(null);

    const saved = await persistEmailIfNeeded(email);
    if (!saved) return;

    onDirtyChange?.(false);
    await onSaved?.();
  }

  const busy = submitting;
  const emailError = emailClientError ?? serverError;

  return (
    <form className="auth-form profile-form notification-channels" onSubmit={handleSubmit}>
      <fieldset className="profile-form__block">
        <label className="auth-form__field">
          <span className="auth-form__label">{t.commChannelsEmailLabel}</span>
          <input
            className="auth-form__input"
            type="email"
            autoComplete="email"
            maxLength={254}
            value={email}
            onChange={(e) => {
              const value = e.target.value;
              setEmail(value);
              syncDirty(value);
            }}
            disabled={busy}
          />
        </label>
        {emailError && (
          <p className="auth-form__error" role="alert">
            {emailError}
          </p>
        )}
      </fieldset>

      <div className="profile-form__actions">
        {onCancel && (
          <button type="button" className="btn btn--ghost" disabled={busy} onClick={onCancel}>
            {t.profileEditCancel}
          </button>
        )}
        <button className="btn btn--primary" type="submit" disabled={busy}>
          {t.profileSubmit}
        </button>
      </div>
    </form>
  );
}

/**
 * Read-only «Мої сповіщення» for `/profile` view mode.
 */
export function NotificationChannelsSummary({
  email,
  phoneE164,
}: NotificationChannelsSummaryProps) {
  const { t } = useLocale();
  const emailValue = email?.trim() ?? "";
  const emailOn = Boolean(emailValue);

  return (
    <div className="auth-form profile-form profile-form--readonly notification-channels">
      <fieldset className="profile-form__block profile-form__toggle-block">
        <div className="profile-form__status-row">
          <span>{t.commChannelsEmailLabel}</span>
          <strong>{emailOn ? t.profileSummaryYes : t.profileSummaryNo}</strong>
        </div>
        {emailOn && (
          <div className="profile-form__toggle-body">
            <div className="auth-form__field">
              <p className="profile-form__readonly-value">{emailValue}</p>
            </div>
          </div>
        )}
      </fieldset>

      <fieldset className="profile-form__block profile-form__toggle-block">
        <div className="profile-form__status-row">
          <span className="notification-channels__label-row">
            <span>{t.commChannelsSmsLabel}</span>
            <VerifiedBadge label={t.commChannelsVerified} />
          </span>
          <strong>{t.profileSummaryYes}</strong>
        </div>
        <div className="profile-form__toggle-body">
          <div className="notification-channels__phone-row">
            <span className="auth-form__label">{t.phoneLabel}</span>
            <span className="notification-channels__phone">{phoneE164}</span>
          </div>
        </div>
      </fieldset>
    </div>
  );
}

function VerifiedBadge({ label }: { label: string }) {
  return (
    <img
      className="notification-channels__verified-icon"
      src="/icon-verified.png"
      alt={label}
      title={label}
    />
  );
}

/** @deprecated Prefer {@link NotificationChannelsForm}. */
export { NotificationChannelsForm as EmailChannelsForm };
