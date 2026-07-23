import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
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
  return preferred ?? "sms";
}

/**
 * Edit form for `/profile` «Сповіщення».
 * Gentelella `.list-group` rows with `.form-check` radios and `.toggle-row` layout.
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
  const emailConnected = false;
  const telegramConnected = Boolean(telegramUserId?.trim());
  const smsConnected = Boolean(phoneE164.trim());
  const connectedMap: ChannelConnectedMap = {
    email: emailConnected,
    telegram: telegramConnected,
    sms: smsConnected,
  };
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
    <form onSubmit={handleSubmit}>
      <div className="list-group channel-list">
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
          panel={
            showEmailPanel ? (
              <div className="channel-panel">
                {emailPhase === "edit" && (
                  <>
                    <div className="form-group">
                      <label className="form-label" htmlFor={`${groupId}-email`}>
                        {t.commChannelsEmailLabel}
                      </label>
                      <input
                        id={`${groupId}-email`}
                        className="form-control"
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
                    </div>
                    <div className="channel-panel__actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
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
                    <p className="form-help">{maskedEmail}</p>
                    <div className="form-group">
                      <label className="form-label" htmlFor={`${groupId}-code`}>
                        {t.commChannelsEmailCodeLabel}
                      </label>
                      <input
                        id={`${groupId}-code`}
                        className="form-control"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={8}
                        value={emailCode}
                        onChange={(e) => setEmailCode(e.target.value)}
                        disabled={busy}
                      />
                    </div>
                    <div className="channel-panel__actions">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        disabled={busy}
                        onClick={handleConfirmEmailCode}
                      >
                        {t.commChannelsConfirmCode}
                      </button>
                    </div>
                  </>
                )}
                {emailStubNotice && (
                  <p className="form-help" role="status">
                    {emailStubNotice}
                  </p>
                )}
                {emailError && (
                  <p className="form-error" role="alert">
                    {emailError}
                  </p>
                )}
              </div>
            ) : null
          }
        />

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
          panel={
            telegramExpanded && !telegramConnected ? (
              <div className="channel-panel">
                <div className="channel-panel__actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={busy}
                    onClick={handleTelegramConnectClick}
                  >
                    {t.commChannelsTelegramConnect}
                  </button>
                </div>
                {telegramStubNotice && (
                  <p className="form-help" role="status">
                    {t.commChannelsTelegramUnavailable}
                  </p>
                )}
              </div>
            ) : null
          }
        />

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
      </div>

      <div className="form-actions right">
        {onCancel && (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onCancel}>
            {t.profileEditCancel}
          </button>
        )}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {t.profileSubmit}
        </button>
      </div>
    </form>
  );
}

/** Read-only «Сповіщення» for `/profile` view mode. */
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
    <div className="list-group channel-list" role="list">
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
  panel,
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
  panel?: ReactNode;
}) {
  const { t } = useLocale();
  const inputId = `${name}-${value}`;

  return (
    <div className={`list-group-item${checked ? " active" : ""}`}>
      <div className="toggle-row">
        <div>
          <label className="form-check" htmlFor={inputId}>
            <input
              id={inputId}
              type="radio"
              name={name}
              value={value}
              checked={checked}
              disabled={busy || !connected}
              onChange={onSelect}
            />
            <span>{label}</span>
          </label>
          <ChannelIdentifier
            identifier={identifier}
            pendingIdentifier={pendingIdentifier}
            asDesc
          />
          <span className="visually-hidden">
            {connected ? t.commChannelsConnected : t.commChannelsDisconnected}
          </span>
        </div>
        <ConnectionStatus
          connected={connected}
          onConnectClick={onStatusClick}
          disabled={busy}
        />
      </div>
      {panel}
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
    <div className={`list-group-item${preferred ? " active" : ""}`} role="listitem">
      <div className="toggle-row">
        <div>
          <div className="label">{label}</div>
          <ChannelIdentifier
            identifier={identifier}
            pendingIdentifier={pendingIdentifier}
            asDesc
          />
          <span className="visually-hidden">
            {preferred ? t.commChannelsPreferred : ""}
            {connected ? t.commChannelsConnected : t.commChannelsDisconnected}
          </span>
        </div>
        {connected ? <ConnectionStatus connected /> : null}
      </div>
    </div>
  );
}

function ChannelIdentifier({
  identifier,
  pendingIdentifier,
  asDesc = false,
}: {
  identifier: string | null;
  pendingIdentifier?: string | null;
  asDesc?: boolean;
}) {
  if (identifier) {
    return asDesc ? (
      <div className="desc">{identifier}</div>
    ) : (
      <span className="meta">{identifier}</span>
    );
  }
  if (pendingIdentifier) {
    return asDesc ? (
      <div className="desc channel-pending">{pendingIdentifier}</div>
    ) : (
      <span className="meta channel-pending">{pendingIdentifier}</span>
    );
  }
  return null;
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
      <span className="status status-green" title={t.commChannelsConnected}>
        <img
          className="channel-status-icon"
          src="/icon-channel-connected.png"
          alt=""
          aria-hidden="true"
        />
        <span className="visually-hidden">{t.commChannelsConnected}</span>
      </span>
    );
  }

  if (onConnectClick) {
    return (
      <button
        type="button"
        className="btn btn-sm btn-outline channel-connect-btn"
        onClick={onConnectClick}
        disabled={disabled}
        title={t.commChannelsConnect}
        aria-label={t.commChannelsConnect}
      >
        <img
          className="channel-status-icon channel-status-icon--idle"
          src="/icon-channel-disconnected.png"
          alt=""
          aria-hidden="true"
        />
        <img
          className="channel-status-icon channel-status-icon--hover"
          src="/icon-channel-connected.png"
          alt=""
          aria-hidden="true"
        />
        <span className="channel-connect-label">{t.commChannelsConnect}</span>
      </button>
    );
  }

  return (
    <span className="status status-red" title={t.commChannelsDisconnected}>
      <img
        className="channel-status-icon"
        src="/icon-channel-disconnected.png"
        alt=""
        aria-hidden="true"
      />
      <span className="visually-hidden">{t.commChannelsDisconnected}</span>
    </span>
  );
}

/** @deprecated Prefer {@link NotificationChannelsForm}. */
export { NotificationChannelsForm as EmailChannelsForm };
