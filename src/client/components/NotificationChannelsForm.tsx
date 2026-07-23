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
 * Channel rows with radios (disabled until connected) and connect affordances.
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
      <div
        className="channel-list"
        role="radiogroup"
        aria-label={t.commChannelsTitle}
      >
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
  const { t } = useLocale();
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
    <div className="channel-list" role="list" aria-label={t.commChannelsTitle}>
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
  const selectable = connected && !busy;

  return (
    <div className="channel-row">
      <div className="channel-row__main">
        <div className="channel-row__info">
          <label
            className={`form-check channel-choice${selectable ? "" : " is-muted"}`}
            htmlFor={inputId}
          >
            <input
              id={inputId}
              type="radio"
              name={name}
              value={value}
              checked={checked}
              disabled={!selectable}
              onChange={onSelect}
            />
            <span className="channel-choice__label">{label}</span>
          </label>
          <ChannelIdentifier
            identifier={identifier}
            pendingIdentifier={pendingIdentifier}
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
    <div className="channel-row" role="listitem">
      <div className="channel-row__main">
        <div className="channel-row__info">
          <ChannelChoiceView
            preferred={preferred}
            muted={!connected}
            label={label}
            preferredTitle={t.commChannelsPreferred}
          />
          <ChannelIdentifier
            identifier={identifier}
            pendingIdentifier={pendingIdentifier}
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

/**
 * View-mode preferred indicator: same radio control as edit (checked + disabled),
 * or an empty slot so labels stay aligned.
 */
function ChannelChoiceView({
  preferred,
  muted,
  label,
  preferredTitle,
}: {
  preferred: boolean;
  muted: boolean;
  label: string;
  preferredTitle: string;
}) {
  return (
    <div className={`form-check channel-choice${muted ? " is-muted" : ""}`}>
      {preferred ? (
        <input
          type="radio"
          checked
          disabled
          readOnly
          tabIndex={-1}
          title={preferredTitle}
          aria-label={preferredTitle}
          onChange={() => undefined}
        />
      ) : (
        <span className="channel-pref-slot" aria-hidden="true" />
      )}
      <span className="channel-choice__label">{label}</span>
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
    return <div className="channel-row__id">{identifier}</div>;
  }
  if (pendingIdentifier) {
    return (
      <div className="channel-row__id channel-row__id--pending">
        {pendingIdentifier}
      </div>
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
      <span className="status status-green channel-status" title={t.commChannelsConnected}>
        <ChannelConnectedIcon className="channel-status-icon" />
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
        <ChannelDisconnectedIcon className="channel-status-icon channel-status-icon--idle" />
        <ChannelConnectedIcon className="channel-status-icon channel-status-icon--hover" />
        <span className="channel-connect-label">{t.commChannelsConnect}</span>
      </button>
    );
  }

  return (
    <span className="status status-red channel-status" title={t.commChannelsDisconnected}>
      <ChannelDisconnectedIcon className="channel-status-icon" />
      <span className="visually-hidden">{t.commChannelsDisconnected}</span>
    </span>
  );
}

/** Chrome stroke — connected / verified channel. */
function ChannelConnectedIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8.5 12.25 10.75 14.5 15.5 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Chrome stroke — disconnected / needs connect (unplug). */
function ChannelDisconnectedIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9.5 7.5v3.5M14.5 7.5v3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 11h8a1.5 1.5 0 0 1 1.5 1.5V14a4.5 4.5 0 0 1-4.5 4.5h-2A4.5 4.5 0 0 1 6.5 14v-1.5A1.5 1.5 0 0 1 8 11z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 5.5h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** @deprecated Prefer {@link NotificationChannelsForm}. */
export { NotificationChannelsForm as EmailChannelsForm };
