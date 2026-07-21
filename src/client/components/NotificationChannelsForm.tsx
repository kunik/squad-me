import { useEffect, useId, useState, type FormEvent } from "react";
import { maskEmail, maskPhoneE164 } from "../lib/maskIdentity";
import { useLocale } from "../locale";

const SIMPLE_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NotifyChannel = "email" | "telegram" | "sms";

type EmailConnectPhase = "idle" | "edit" | "awaiting_code";

type NotificationChannelsFormProps = {
  submitting: boolean;
  serverError: string | null;
  /** Prefill / show existing account email (collection; not OTP-verified). */
  initialEmail?: string | null;
  /** Auth-verified phone — SMS channel is treated as connected. */
  phoneE164: string;
  /** Linked Telegram user id when present (linking API not wired yet). */
  telegramUserId?: string | null;
  /**
   * Persist email via `POST /api/auth/account/email` (collection only; no OTP yet).
   * Return `true` when saved so the UI can continue.
   */
  onSaveEmail: (email: string) => boolean | Promise<boolean>;
  onDirtyChange?: (dirty: boolean) => void;
  onCancel?: () => void;
  /**
   * Called after a successful section Save (email persisted when needed).
   * Parent exits edit mode / clears dirty. Preferred-channel radio has no API yet.
   */
  onSaved?: () => void | Promise<void>;
};

type NotificationChannelsSummaryProps = {
  email: string | null | undefined;
  phoneE164: string;
  telegramUserId?: string | null;
  /** Active preference when known; defaults to SMS (only always-connected channel). */
  preferredChannel?: NotifyChannel | null;
};

const CHANNEL_ORDER: NotifyChannel[] = ["email", "telegram", "sms"];

type ChannelConnectedMap = Record<NotifyChannel, boolean>;

/** Prefer `preferred` when that channel is connected; else first connected in UI order. */
function resolvePreferred(
  preferred: NotifyChannel | null | undefined,
  connected: ChannelConnectedMap,
): NotifyChannel {
  if (preferred && connected[preferred]) return preferred;
  for (const channel of CHANNEL_ORDER) {
    if (connected[channel]) return channel;
  }
  // Nothing connected — keep SMS as the UI default (radio stays disabled).
  return preferred ?? "sms";
}

/**
 * Edit form for `/profile` «Сповіщення».
 * Radios pick the active notify preference (enabled only when connected);
 * status icons reflect connect state and open expandable connect panels when disconnected.
 */
export function NotificationChannelsForm({
  submitting,
  serverError,
  initialEmail = null,
  phoneE164,
  telegramUserId = null,
  onSaveEmail,
  onDirtyChange,
  onCancel,
  onSaved,
}: NotificationChannelsFormProps) {
  const { t } = useLocale();
  const groupId = useId();

  const baselineEmail = (initialEmail ?? "").trim().toLowerCase();
  const emailConnected = false; // email OTP verify not shipped — never fake connected
  const telegramConnected = Boolean(telegramUserId?.trim());
  const smsConnected = Boolean(phoneE164.trim());
  const connectedMap: ChannelConnectedMap = {
    email: emailConnected,
    telegram: telegramConnected,
    sms: smsConnected,
  };
  // Preference API does not exist yet — fall back to first connected (usually SMS).
  const baselinePreferred = resolvePreferred(null, connectedMap);

  const [preferred, setPreferred] = useState<NotifyChannel>(baselinePreferred);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [emailCode, setEmailCode] = useState("");
  const [emailPhase, setEmailPhase] = useState<EmailConnectPhase>("idle");
  const [telegramExpanded, setTelegramExpanded] = useState(false);
  const [telegramStubNotice, setTelegramStubNotice] = useState(false);
  const [emailClientError, setEmailClientError] = useState<string | null>(null);
  const [emailStubNotice, setEmailStubNotice] = useState<string | null>(null);

  useEffect(() => {
    setEmail(initialEmail ?? "");
    setEmailCode("");
    setEmailPhase("idle");
    setEmailClientError(null);
    setEmailStubNotice(null);
    setPreferred(
      resolvePreferred(null, {
        email: false,
        telegram: Boolean(telegramUserId?.trim()),
        sms: Boolean(phoneE164.trim()),
      }),
    );
    setTelegramExpanded(false);
    setTelegramStubNotice(false);
  }, [initialEmail, telegramUserId, phoneE164]);

  function syncDirty(next: { preferred?: NotifyChannel; email?: string }) {
    const nextPreferred = next.preferred ?? preferred;
    const nextEmail = (next.email ?? email).trim().toLowerCase();
    onDirtyChange?.(
      nextPreferred !== baselinePreferred || nextEmail !== baselineEmail,
    );
  }

  async function persistEmailIfNeeded(raw: string): Promise<boolean> {
    const trimmed = raw.trim().toLowerCase();
    if (!trimmed) {
      // Empty is OK when preference is not email / user did not change collection.
      if (!baselineEmail) return true;
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
    setEmailStubNotice(null);

    const emailTouched =
      email.trim().toLowerCase() !== baselineEmail || emailPhase !== "idle";
    if (emailTouched || preferred === "email") {
      const saved = await persistEmailIfNeeded(email);
      if (!saved) {
        setEmailPhase((phase) => (phase === "idle" ? "edit" : phase));
        return;
      }
    }

    onDirtyChange?.(false);
    await onSaved?.();
  }

  function openEmailConnect() {
    setEmailPhase("edit");
    setEmailStubNotice(null);
    setEmailClientError(null);
  }

  function openTelegramConnect() {
    setTelegramExpanded(true);
    setTelegramStubNotice(false);
  }

  async function handleSendEmailCode() {
    setEmailClientError(null);
    setEmailStubNotice(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setEmailClientError(t.commChannelsEmailRequired);
      return;
    }
    if (trimmed.length > 254 || !SIMPLE_EMAIL_RE.test(trimmed)) {
      setEmailClientError(t.authErrorInvalidEmail);
      return;
    }
    // Collection can succeed; OTP send is not wired — stay honest.
    if (trimmed !== baselineEmail) {
      const saved = await onSaveEmail(trimmed);
      if (!saved) return;
      setEmail(trimmed);
      syncDirty({ email: trimmed });
    }
    setEmailPhase("awaiting_code");
    setEmailStubNotice(t.commChannelsEmailVerifyUnavailable);
  }

  function handleConfirmEmailCode() {
    setEmailStubNotice(t.commChannelsEmailVerifyUnavailable);
  }

  function handleTelegramConnectClick() {
    setTelegramStubNotice(true);
  }

  const busy = submitting;
  const emailError = emailClientError ?? serverError;
  const showEmailPanel = emailPhase !== "idle";
  const emailIdentifier = email.trim();
  const maskedEmail = emailIdentifier ? maskEmail(emailIdentifier) : "";
  const maskedPhone = phoneE164.trim() ? maskPhoneE164(phoneE164) : "";

  return (
    <form className="auth-form profile-form notification-channels" onSubmit={handleSubmit}>
      <fieldset className="notification-channels__radios">
        <legend className="visually-hidden">{t.commChannelsTitle}</legend>

        <ChannelRadioRow
          name={groupId}
          value="email"
          checked={preferred === "email"}
          label={t.commChannelsEmailLabel}
          connected={emailConnected}
          identifier={emailConnected ? maskedEmail : null}
          pendingIdentifier={!emailConnected && maskedEmail ? maskedEmail : null}
          busy={busy}
          onSelect={() => {
            if (!emailConnected) return;
            setPreferred("email");
            syncDirty({ preferred: "email" });
          }}
          onStatusClick={emailConnected ? undefined : openEmailConnect}
        />
        {showEmailPanel && (
          <div className="notification-channels__connect-panel profile-form__toggle-body">
            {emailPhase === "edit" && (
              <>
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
                      syncDirty({ email: value });
                    }}
                    disabled={busy}
                  />
                </label>
                <div className="notification-channels__actions">
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={busy}
                    onClick={() => void handleSendEmailCode()}
                  >
                    {t.commChannelsSendCode}
                  </button>
                </div>
              </>
            )}
            {emailPhase === "awaiting_code" && (
              <>
                <p className="notification-channels__pending-email">{maskedEmail}</p>
                <label className="auth-form__field">
                  <span className="auth-form__label">{t.commChannelsEmailCodeLabel}</span>
                  <input
                    className="auth-form__input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value)}
                    disabled={busy}
                  />
                </label>
                <div className="notification-channels__actions">
                  <button
                    type="button"
                    className="btn btn--primary"
                    disabled={busy}
                    onClick={handleConfirmEmailCode}
                  >
                    {t.commChannelsConfirmCode}
                  </button>
                </div>
              </>
            )}
            {emailStubNotice && (
              <p className="auth-form__field-hint" role="status">
                {emailStubNotice}
              </p>
            )}
            {emailError && (
              <p className="auth-form__error" role="alert">
                {emailError}
              </p>
            )}
          </div>
        )}

        <ChannelRadioRow
          name={groupId}
          value="telegram"
          checked={preferred === "telegram"}
          label={t.commChannelsTelegramLabel}
          connected={telegramConnected}
          identifier={telegramConnected ? telegramUserId!.trim() : null}
          busy={busy}
          onSelect={() => {
            if (!telegramConnected) return;
            setPreferred("telegram");
            syncDirty({ preferred: "telegram" });
          }}
          onStatusClick={telegramConnected ? undefined : openTelegramConnect}
        />
        {telegramExpanded && !telegramConnected && (
          <div className="notification-channels__connect-panel profile-form__toggle-body">
            <div className="notification-channels__actions">
              <button
                type="button"
                className="btn btn--primary"
                disabled={busy}
                onClick={handleTelegramConnectClick}
              >
                {t.commChannelsTelegramConnect}
              </button>
            </div>
            {telegramStubNotice && (
              <p className="auth-form__field-hint" role="status">
                {t.commChannelsTelegramUnavailable}
              </p>
            )}
          </div>
        )}

        <ChannelRadioRow
          name={groupId}
          value="sms"
          checked={preferred === "sms"}
          label={t.commChannelsSmsLabel}
          connected={smsConnected}
          identifier={smsConnected ? maskedPhone : null}
          busy={busy}
          onSelect={() => {
            if (!smsConnected) return;
            setPreferred("sms");
            syncDirty({ preferred: "sms" });
          }}
        />
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
 * Read-only «Сповіщення» for `/profile` view mode.
 */
export function NotificationChannelsSummary({
  email,
  phoneE164,
  telegramUserId = null,
  preferredChannel = null,
}: NotificationChannelsSummaryProps) {
  const emailConnected = false;
  const telegramConnected = Boolean(telegramUserId?.trim());
  const smsConnected = Boolean(phoneE164.trim());
  const preferred = resolvePreferred(preferredChannel, {
    email: emailConnected,
    telegram: telegramConnected,
    sms: smsConnected,
  });
  const emailValue = email?.trim() ?? "";
  const maskedEmail = emailValue ? maskEmail(emailValue) : "";
  const maskedPhone = phoneE164.trim() ? maskPhoneE164(phoneE164) : "";

  return (
    <div className="auth-form profile-form profile-form--readonly notification-channels">
      <div className="notification-channels__radios" role="list">
        <ChannelSummaryRow
          labelKey="email"
          preferred={preferred === "email"}
          connected={emailConnected}
          identifier={emailConnected ? maskedEmail : null}
          pendingIdentifier={!emailConnected && maskedEmail ? maskedEmail : null}
        />
        <ChannelSummaryRow
          labelKey="telegram"
          preferred={preferred === "telegram"}
          connected={telegramConnected}
          identifier={telegramConnected ? telegramUserId!.trim() : null}
        />
        <ChannelSummaryRow
          labelKey="sms"
          preferred={preferred === "sms"}
          connected={smsConnected}
          identifier={maskedPhone || null}
        />
      </div>
    </div>
  );
}

function ChannelRadioRow({
  name,
  value,
  checked,
  label,
  connected,
  identifier,
  pendingIdentifier,
  busy,
  onSelect,
  onStatusClick,
}: {
  name: string;
  value: NotifyChannel;
  checked: boolean;
  label: string;
  connected: boolean;
  identifier: string | null;
  pendingIdentifier?: string | null;
  busy: boolean;
  onSelect: () => void;
  onStatusClick?: () => void;
}) {
  const { t } = useLocale();
  const inputId = `${name}-${value}`;

  return (
    <div
      className={`notification-channels__row${checked ? " is-selected" : ""}`}
    >
      <label
        className="notification-channels__radio notification-channels__control"
        htmlFor={inputId}
      >
        <input
          id={inputId}
          type="radio"
          name={name}
          value={value}
          checked={checked}
          disabled={busy || !connected}
          onChange={onSelect}
        />
      </label>
      <label className="notification-channels__label-row" htmlFor={inputId}>
        {label}
        <span className="visually-hidden">
          {connected ? t.commChannelsConnected : t.commChannelsDisconnected}
        </span>
      </label>
      <span className="notification-channels__status-slot">
        <ConnectionStatus
          connected={connected}
          onConnectClick={onStatusClick}
          disabled={busy}
        />
      </span>
      <ChannelIdentifier
        identifier={identifier}
        pendingIdentifier={pendingIdentifier}
      />
    </div>
  );
}

function ChannelSummaryRow({
  labelKey,
  preferred,
  connected,
  identifier,
  pendingIdentifier,
}: {
  labelKey: NotifyChannel;
  preferred: boolean;
  connected: boolean;
  identifier: string | null;
  pendingIdentifier?: string | null;
}) {
  const { t } = useLocale();
  const label =
    labelKey === "email"
      ? t.commChannelsEmailLabel
      : labelKey === "telegram"
        ? t.commChannelsTelegramLabel
        : t.commChannelsSmsLabel;

  return (
    <div
      className={`notification-channels__row notification-channels__row--summary${
        preferred ? " is-selected" : ""
      }`}
    >
      <span
        className="notification-channels__summary-pref notification-channels__control"
        aria-hidden="true"
      >
        {preferred ? "●" : "○"}
      </span>
      <span className="notification-channels__label-row">
        {label}
        <span className="visually-hidden">
          {preferred ? t.commChannelsPreferred : ""}
          {connected ? t.commChannelsConnected : t.commChannelsDisconnected}
        </span>
      </span>
      <span className="notification-channels__status-slot">
        {connected ? <ConnectionStatus connected /> : null}
      </span>
      <ChannelIdentifier
        identifier={identifier}
        pendingIdentifier={pendingIdentifier}
      />
    </div>
  );
}

function ChannelIdentifier({
  identifier,
  pendingIdentifier,
}: {
  identifier: string | null;
  pendingIdentifier?: string | null;
}) {
  if (identifier) {
    return (
      <span className="notification-channels__identifier">{identifier}</span>
    );
  }
  if (pendingIdentifier) {
    return (
      <span className="notification-channels__identifier notification-channels__identifier--pending">
        {pendingIdentifier}
      </span>
    );
  }
  return <span className="notification-channels__identifier" aria-hidden="true" />;
}

function ConnectionStatus({
  connected,
  onConnectClick,
  disabled = false,
}: {
  connected: boolean;
  onConnectClick?: () => void;
  disabled?: boolean;
}) {
  const { t } = useLocale();

  if (connected) {
    return (
      <img
        className="notification-channels__status-icon"
        src="/icon-channel-connected.png"
        alt={t.commChannelsConnected}
        title={t.commChannelsConnected}
      />
    );
  }

  if (onConnectClick) {
    return (
      <button
        type="button"
        className="notification-channels__status-btn"
        onClick={onConnectClick}
        disabled={disabled}
        title={t.commChannelsConnect}
        aria-label={t.commChannelsConnect}
      >
        <img
          className="notification-channels__status-icon notification-channels__status-icon--idle"
          src="/icon-channel-disconnected.png"
          alt=""
          aria-hidden="true"
        />
        <img
          className="notification-channels__status-icon notification-channels__status-icon--hover"
          src="/icon-channel-connected.png"
          alt=""
          aria-hidden="true"
        />
      </button>
    );
  }

  return (
    <img
      className="notification-channels__status-icon notification-channels__status-icon--static"
      src="/icon-channel-disconnected.png"
      alt={t.commChannelsDisconnected}
      title={t.commChannelsDisconnected}
    />
  );
}

/** @deprecated Prefer {@link NotificationChannelsForm}. */
export { NotificationChannelsForm as EmailChannelsForm };
