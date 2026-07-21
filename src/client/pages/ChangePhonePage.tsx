import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { PublicChrome } from "../components/PublicChrome";
import { OtpStep } from "../components/OtpStep";
import { PasswordField } from "../components/PasswordField";
import { HintPanel } from "../components/HintPanel";
import { FieldLabel } from "../components/FieldHint";
import { TurnstileWidget } from "../components/TurnstileWidget";
import { useAuth } from "../auth";
import { useLocale } from "../locale";
import { getAuthConfig, logout, otpStart, phoneChange, reauth } from "../lib/authApi";
import { prepareSignOutLoginRedirect } from "../lib/authNotice";
import { translateAuthError } from "../lib/authErrors";
import { maskPhoneE164 } from "../lib/maskIdentity";

type Step = "confirm" | "new_phone" | "otp";

/** UA-first digit form for comparing typed phone to the session account's E.164. */
function phoneDigitsForCompare(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) {
    digits = `380${digits.slice(1)}`;
  }
  return digits;
}

function sameAccountPhone(entered: string, accountE164: string): boolean {
  return phoneDigitsForCompare(entered) === phoneDigitsForCompare(accountE164);
}

/**
 * Authenticated wizard: confirm current phone (full number — UI elsewhere is
 * masked) + password → short-lived reauth proof → OTP on the new number →
 * phone/change consumes reauth proof + OTP proof. No OTP to the old number.
 */
export function ChangePhonePage() {
  const { t } = useLocale();
  const { account, setAccount } = useAuth();
  const location = useLocation();

  const [step, setStep] = useState<Step>("confirm");
  const [currentPhone, setCurrentPhone] = useState("");
  const [password, setPassword] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [resendAfterSeconds, setResendAfterSeconds] = useState(30);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileAttempt, setTurnstileAttempt] = useState(0);
  const handleTurnstileToken = useCallback((token: string | null) => setTurnstileToken(token), []);
  // Keep the reauth proof from step 1 for the final phone/change call.
  const reauthProofRef = useRef<string | null>(null);

  useEffect(() => {
    void getAuthConfig().then((result) => {
      if (result.ok) setTurnstileSiteKey(result.data.turnstileSiteKey);
    });
  }, []);

  if (!account) {
    return null;
  }

  const maskedCurrent = maskPhoneE164(account.phoneE164);

  async function handleConfirmSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    // Prefer FormData so browser password autofill (often missing from React
    // controlled state) still reaches the server.
    const formData = new FormData(event.currentTarget);
    const phoneValue = String(formData.get("currentPhone") ?? currentPhone).trim();
    const passwordValue = String(formData.get("password") ?? password);
    if (phoneValue !== currentPhone) setCurrentPhone(phoneValue);
    if (passwordValue !== password) setPassword(passwordValue);

    if (!phoneValue || !passwordValue) {
      setError(t.authErrorInvalidCredentials);
      return;
    }
    // Refuse before reauth if the typed number is not this session's phone.
    if (!sameAccountPhone(phoneValue, account.phoneE164)) {
      setError(t.authErrorInvalidCredentials);
      return;
    }

    setSubmitting(true);
    try {
      const result = await reauth(phoneValue, passwordValue, "change_phone");
      if (!result.ok) {
        setError(translateAuthError(result.error, t));
        return;
      }
      reauthProofRef.current = result.data.reauthProofToken;
      setStep("new_phone");
    } catch {
      setError(t.authErrorNetwork);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNewPhoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await otpStart(newPhone, "change_phone", turnstileToken ?? undefined);
      if (!result.ok) {
        setError(translateAuthError(result.error, t));
        return;
      }
      setResendAfterSeconds(result.data.resendAfterSeconds);
      setStep("otp");
    } finally {
      if (turnstileSiteKey) {
        setTurnstileToken(null);
        setTurnstileAttempt((current) => current + 1);
      }
      setSubmitting(false);
    }
  }

  async function handleOtpVerified(proof: { proofToken: string }) {
    setError(null);
    const reauthProofToken = reauthProofRef.current;
    if (!reauthProofToken) {
      setStep("confirm");
      setError(t.authErrorInvalidProof);
      return;
    }
    setSubmitting(true);
    try {
      const result = await phoneChange(proof.proofToken, reauthProofToken);
      if (!result.ok) {
        if (result.error === "invalid_or_expired_proof") {
          // Either reauth or OTP proof expired — restart identity step.
          reauthProofRef.current = null;
          setStep("confirm");
        } else {
          setStep("new_phone");
        }
        setError(translateAuthError(result.error, t));
        return;
      }
      reauthProofRef.current = null;
      await logout().catch(() => undefined);
      prepareSignOutLoginRedirect("phone_changed", location.pathname);
      setAccount(null);
    } finally {
      setSubmitting(false);
    }
  }

  const stepNumber = step === "confirm" ? 1 : step === "new_phone" ? 2 : 3;

  return (
    <>
      <PublicChrome
        hint={
          <HintPanel progress={`${t.flowStep} ${stepNumber} ${t.flowStepOf} 3`}>
            {step === "confirm"
              ? t.changePhoneConfirmHint
              : step === "new_phone"
                ? t.changePhoneNewHint
                : t.otpSentNotice}
          </HintPanel>
        }
      />
      <main className="auth-page">
        {step === "confirm" ? (
          <>
            <h1 className="auth-page__title">{t.changePhoneTitle}</h1>
            <p className="auth-page__hint">
              {t.changePhoneCurrentMaskedPrefix} <strong>{maskedCurrent}</strong>
            </p>
            <form className="auth-form" onSubmit={handleConfirmSubmit}>
              <label className="auth-form__field">
                <FieldLabel hint={t.phoneHint}>{t.changePhoneCurrentLabel}</FieldLabel>
                <input
                  className="auth-form__input"
                  type="tel"
                  name="currentPhone"
                  inputMode="tel"
                  autoComplete="tel"
                  value={currentPhone}
                  onChange={(e) => setCurrentPhone(e.target.value)}
                  placeholder="0XXXXXXXXX"
                  required
                />
              </label>
              <PasswordField
                id="change-phone-password"
                label={t.passwordLabel}
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                required
              />
              {error && (
                <p className="auth-form__error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="btn btn--primary auth-form__submit"
                type="submit"
                disabled={submitting}
              >
                {submitting ? t.loginSubmitting : t.continueButton}
              </button>
            </form>
            <Link to="/profile" className="btn btn--ghost auth-page__back">
              {t.changePhoneBackToProfile}
            </Link>
          </>
        ) : null}

        {step === "new_phone" ? (
          <>
            <h1 className="auth-page__title">{t.changePhoneNewTitle}</h1>
            <form className="auth-form" onSubmit={handleNewPhoneSubmit}>
              <label className="auth-form__field">
                <FieldLabel hint={t.phoneHint}>{t.changePhoneNewLabel}</FieldLabel>
                <input
                  className="auth-form__input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="0XXXXXXXXX"
                  required
                />
              </label>
              {turnstileSiteKey && (
                <TurnstileWidget
                  key={turnstileAttempt}
                  siteKey={turnstileSiteKey}
                  onToken={handleTurnstileToken}
                />
              )}
              {error && (
                <p className="auth-form__error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="btn btn--primary auth-form__submit"
                type="submit"
                disabled={submitting || Boolean(turnstileSiteKey && !turnstileToken)}
              >
                {t.forgotSendCode}
              </button>
            </form>
            <button
              type="button"
              className="auth-page__link auth-page__link--button"
              onClick={() => {
                setError(null);
                reauthProofRef.current = null;
                setStep("confirm");
              }}
            >
              {t.backButton}
            </button>
          </>
        ) : null}

        {step === "otp" ? (
          submitting ? (
            <p className="auth-page__hint">{t.changePhoneSubmitting}</p>
          ) : (
            <OtpStep
              phoneE164={newPhone}
              purpose="change_phone"
              initialResendAfterSeconds={resendAfterSeconds}
              turnstileSiteKey={turnstileSiteKey}
              onVerified={(proof) => {
                void handleOtpVerified(proof);
              }}
              onBack={() => {
                setError(null);
                setStep("new_phone");
              }}
            />
          )
        ) : null}
      </main>
    </>
  );
}
