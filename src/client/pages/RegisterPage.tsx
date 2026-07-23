import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
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
    <AuthLayout
      hint={
        <HintPanel
          progress={stepProgress}
          tone={wizard.accountMode === "password_reset" ? "warning" : "info"}
        >
          {stepHint}
        </HintPanel>
      }
    >
        {wizard.step === "phone" && (
          <>
            <h1 className="auth-title">{t.registerTitle}</h1>
            <form onSubmit={wizard.handlePhoneSubmit}>
              <div className="form-group">
                <FieldLabel htmlFor="register-phone" hint={t.phoneHint}>
                  {t.phoneLabel}
                </FieldLabel>
                <input
                  id="register-phone"
                  className="form-control"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={wizard.phone}
                  onChange={(e) => wizard.setPhone(e.target.value)}
                  placeholder="0XXXXXXXXX"
                  required
                />
              </div>
              {wizard.turnstileSiteKey && (
                <TurnstileWidget
                  key={wizard.turnstileAttempt}
                  siteKey={wizard.turnstileSiteKey}
                  onToken={wizard.handleTurnstileToken}
                />
              )}
              {wizard.error && (
                <div className="form-error form-error--banner" role="alert">
                  {wizard.error}
                </div>
              )}
              <button
                className="btn btn-primary btn-lg btn-block"
                type="submit"
                disabled={
                  wizard.submitting ||
                  Boolean(wizard.turnstileSiteKey && !wizard.turnstileToken)
                }
              >
                {t.registerSendCode}
              </button>
            </form>
            <div className="auth-links">
              <p>
                {t.registerHaveAccount} <Link to="/login">{t.registerLoginLink}</Link>
              </p>
              <Link to="/">{t.backHome}</Link>
            </div>
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
            <h1 className="auth-title">{t.passwordLabel}</h1>
            <form onSubmit={handlePasswordSubmit}>
              <div className="form-group">
                <FieldLabel htmlFor="register-nickname" hint={t.profileNicknameHint}>
                  {t.profileNicknameLabel}
                </FieldLabel>
                <input
                  id="register-nickname"
                  className="form-control"
                  type="text"
                  autoComplete="off"
                  maxLength={NICKNAME_MAX_LENGTH}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                />
              </div>
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
                <div className="form-error form-error--banner" role="alert">
                  {wizard.error}
                </div>
              )}
              <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={wizard.submitting}>
                {wizard.submitting ? t.registerSubmitting : t.registerSubmit}
              </button>
            </form>
            <div className="auth-links">
              <button type="button" className="link-btn" onClick={wizard.backToOtp}>
                {t.backButton}
              </button>
            </div>
          </>
        )}
    </AuthLayout>
  );
}
