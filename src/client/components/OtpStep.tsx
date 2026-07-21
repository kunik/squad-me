import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useLocale } from "../locale";
import { otpStart, otpVerify, type AccountMode, type OtpPurpose } from "../lib/authApi";
import { translateAuthError } from "../lib/authErrors";
import { TurnstileWidget } from "./TurnstileWidget";

type OtpStepProps = {
  phoneE164: string;
  purpose: OtpPurpose;
  initialResendAfterSeconds: number;
  onVerified: (proof: { proofToken: string; expiresAt: string; accountMode?: AccountMode }) => void;
  onBack: () => void;
  turnstileSiteKey?: string | null;
};

/** Shared phone-code step for the register and forgot-password wizards. */
export function OtpStep({
  phoneE164,
  purpose,
  initialResendAfterSeconds,
  onVerified,
  onBack,
  turnstileSiteKey,
}: OtpStepProps) {
  const { t } = useLocale();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(initialResendAfterSeconds);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileAttempt, setTurnstileAttempt] = useState(0);
  const handleTurnstileToken = useCallback((token: string | null) => setTurnstileToken(token), []);

  useEffect(() => {
    const id = setInterval(() => {
      setCooldown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  async function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setVerifying(true);
    try {
      const result = await otpVerify(phoneE164, purpose, code);
      if (!result.ok) {
        setError(translateAuthError(result.error, t));
        return;
      }
      onVerified(result.data);
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    setError(null);
    setResending(true);
    try {
      const result = await otpStart(phoneE164, purpose, turnstileToken ?? undefined);
      if (!result.ok) {
        setError(translateAuthError(result.error, t));
        if (result.retryAfterSeconds) {
          setCooldown(result.retryAfterSeconds);
        }
        return;
      }
      setCooldown(result.data.resendAfterSeconds);
      setTurnstileToken(null);
    } finally {
      if (turnstileSiteKey) {
        setTurnstileToken(null);
        setTurnstileAttempt((current) => current + 1);
      }
      setResending(false);
    }
  }

  return (
    <div className="auth-wizard-step">
      <h2 className="auth-page__title">{t.otpStepTitle}</h2>
      <form className="auth-form" onSubmit={handleVerify}>
        <label className="auth-form__field">
          <span className="auth-form__label">{t.otpLabel}</span>
          <input
            className="auth-form__input auth-form__input--code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            required
          />
        </label>
        {error && (
          <p className="auth-form__error" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn--primary auth-form__submit" type="submit" disabled={verifying}>
          {verifying ? t.otpVerifying : t.otpVerify}
        </button>
      </form>
      <div className="auth-page__links">
        {turnstileSiteKey && cooldown === 0 && (
          <TurnstileWidget
            key={turnstileAttempt}
            siteKey={turnstileSiteKey}
            onToken={handleTurnstileToken}
          />
        )}
        <button
          type="button"
          className="btn btn--ghost auth-form__resend"
          onClick={handleResend}
          disabled={cooldown > 0 || resending || Boolean(turnstileSiteKey && !turnstileToken)}
        >
          {cooldown > 0
            ? `${t.otpResendWaitPrefix} ${cooldown}${t.otpResendWaitSuffix}`
            : t.otpResend}
        </button>
        <button type="button" className="auth-page__link auth-page__link--button" onClick={onBack}>
          {t.backButton}
        </button>
      </div>
    </div>
  );
}
