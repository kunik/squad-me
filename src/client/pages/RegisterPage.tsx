import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PublicChrome } from "../components/PublicChrome";
import { OtpStep } from "../components/OtpStep";
import { PasswordField } from "../components/PasswordField";
import { HintPanel } from "../components/HintPanel";
import { FieldLabel } from "../components/FieldHint";
import { TurnstileWidget } from "../components/TurnstileWidget";
import { useAuth } from "../auth";
import { useLocale } from "../locale";
import { register } from "../lib/authApi";
import { PROFILE_PATH, postAuthLandingPath } from "../lib/profileMenu";
import { translateAuthError } from "../lib/authErrors";
import { isValidNickname } from "../lib/profileFormValidation";
import { useProofWizard } from "../hooks/useProofWizard";
import { NICKNAME_MAX_LENGTH } from "../../shared/profileValidation";

// Pre-auth wizard only. Post-auth profile/email steps live on `/profile`
// and are driven by `GET /api/auth/me`'s `onboardingStep`.
export function RegisterPage() {
  const { t } = useLocale();
  const { account, onboardingStep, loading: authLoading, refresh } = useAuth();
  const navigate = useNavigate();
  const wizard = useProofWizard({ purpose: "register", t });
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");

  // Already signed in → leave the pre-auth wizard (onboarding → `/profile`, else matches).
  useEffect(() => {
    if (authLoading || !account) return;
    if (wizard.step === "phone" || wizard.step === "otp" || wizard.step === "password") {
      wizard.clearProof();
      navigate(postAuthLandingPath(onboardingStep), { replace: true });
    }
  }, [authLoading, account, onboardingStep, wizard.step, navigate]);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    wizard.setError(null);
    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) {
      wizard.setError(t.profileErrorNicknameRequired);
      return;
    }
    if (!isValidNickname(trimmedNickname)) {
      wizard.setError(t.profileErrorNicknameCharset);
      return;
    }
    const proof = wizard.requireProofOrReset();
    if (!proof) return;

    wizard.setSubmitting(true);
    try {
      const result = await register(proof, password, trimmedNickname);
      if (!result.ok) {
        if (
          result.error === "invalid_or_expired_proof" ||
          result.error === "phone_already_registered"
        ) {
          wizard.clearProof();
          wizard.setStep("phone");
        }
        wizard.setError(translateAuthError(result.error, t));
        return;
      }
      wizard.setAccountMode(result.data.accountMode);
      wizard.clearProof();
      await refresh();
      navigate(PROFILE_PATH, { replace: true });
    } catch {
      wizard.setError(t.authErrorNetwork);
    } finally {
      wizard.setSubmitting(false);
    }
  }

  const stepProgress = `${t.flowStep} ${
    wizard.step === "phone" ? 1 : wizard.step === "otp" ? 2 : 3
  } ${t.flowStepOf} 3`;
  const stepHint =
    wizard.step === "phone"
      ? t.registerIntro
      : wizard.step === "otp"
        ? t.otpSentNotice
        : wizard.accountMode === "password_reset"
          ? t.registerResetWarning
          : t.registerPasswordHint;

  return (
    <>
      <PublicChrome
        hint={
          <HintPanel
            progress={stepProgress}
            tone={wizard.accountMode === "password_reset" ? "warning" : "info"}
          >
            {stepHint}
          </HintPanel>
        }
      />
      <main className="auth-page">
        {wizard.step === "phone" && (
          <>
            <h1 className="auth-page__title">{t.registerTitle}</h1>
            <form className="auth-form" onSubmit={wizard.handlePhoneSubmit}>
              <label className="auth-form__field">
                <FieldLabel hint={t.phoneHint}>{t.phoneLabel}</FieldLabel>
                <input
                  className="auth-form__input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={wizard.phone}
                  onChange={(e) => wizard.setPhone(e.target.value)}
                  placeholder="0XXXXXXXXX"
                  required
                />
              </label>
              {wizard.turnstileSiteKey && (
                <TurnstileWidget
                  key={wizard.turnstileAttempt}
                  siteKey={wizard.turnstileSiteKey}
                  onToken={wizard.handleTurnstileToken}
                />
              )}
              {wizard.error && (
                <p className="auth-form__error" role="alert">
                  {wizard.error}
                </p>
              )}
              <button
                className="btn btn--primary auth-form__submit"
                type="submit"
                disabled={
                  wizard.submitting ||
                  Boolean(wizard.turnstileSiteKey && !wizard.turnstileToken)
                }
              >
                {t.registerSendCode}
              </button>
            </form>
            <p className="auth-page__hint">
              {t.registerHaveAccount}{" "}
              <Link to="/login" className="auth-page__link">
                {t.registerLoginLink}
              </Link>
            </p>
          </>
        )}

        {wizard.step === "otp" && (
          <OtpStep
            phoneE164={wizard.phone}
            purpose="register"
            initialResendAfterSeconds={wizard.resendAfterSeconds}
            onVerified={wizard.onOtpVerified}
            turnstileSiteKey={wizard.turnstileSiteKey}
            onBack={wizard.backToPhone}
          />
        )}

        {wizard.step === "password" && (
          <>
            <h1 className="auth-page__title">{t.passwordLabel}</h1>
            <form className="auth-form" onSubmit={handlePasswordSubmit}>
              <label className="auth-form__field">
                <FieldLabel hint={t.profileNicknameHint}>{t.profileNicknameLabel}</FieldLabel>
                <input
                  className="auth-form__input"
                  type="text"
                  autoComplete="off"
                  maxLength={NICKNAME_MAX_LENGTH}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                />
              </label>
              <PasswordField
                id="register-password"
                label={t.passwordLabel}
                value={password}
                onChange={setPassword}
                autoComplete="new-password"
                hint={t.passwordHint}
                minLength={8}
                required
              />
              {wizard.error && (
                <p className="auth-form__error" role="alert">
                  {wizard.error}
                </p>
              )}
              <button
                className="btn btn--primary auth-form__submit"
                type="submit"
                disabled={wizard.submitting}
              >
                {wizard.submitting ? t.registerSubmitting : t.registerSubmit}
              </button>
            </form>
            <button
              type="button"
              className="auth-page__link auth-page__link--button"
              onClick={wizard.backToOtp}
            >
              {t.backButton}
            </button>
          </>
        )}

        <Link to="/" className="btn btn--ghost auth-page__back">
          {t.backHome}
        </Link>
      </main>
    </>
  );
}
