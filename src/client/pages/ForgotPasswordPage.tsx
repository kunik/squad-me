import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { OtpStep } from "../components/OtpStep";
import { PasswordField } from "../components/PasswordField";
import { HintPanel } from "../components/HintPanel";
import { FieldLabel } from "../components/FieldHint";
import { TurnstileWidget } from "../components/TurnstileWidget";
import { useLocale } from "../locale";
import { useAuth } from "../auth";
import { logout, passwordReset } from "../lib/authApi";
import { loginPathWithNotice } from "../lib/authNotice";
import { translateAuthError } from "../lib/authErrors";
import { clearOtpProof, saveOtpProof } from "../lib/otpProofStorage";
import { useProofWizard } from "../hooks/useProofWizard";

export function ForgotPasswordPage() {
  const { t } = useLocale();
  const { setAccount } = useAuth();
  const navigate = useNavigate();
  const wizard = useProofWizard({ purpose: "password_reset", t });
  const [newPassword, setNewPassword] = useState("");

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    wizard.setError(null);
    const proof = wizard.requireProofOrReset();
    if (!proof) return;

    wizard.setSubmitting(true);
    try {
      const result = await passwordReset(proof, newPassword);
      if (!result.ok) {
        if (result.error === "invalid_or_expired_proof") {
          wizard.clearProof();
          wizard.setStep("phone");
        }
        wizard.setError(translateAuthError(result.error, t));
        return;
      }
      wizard.clearProof();
      await logout().catch(() => undefined);
      setAccount(null);
      navigate(loginPathWithNotice("password_changed"), { replace: true });
    } finally {
      wizard.setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      hint={
        <HintPanel
          progress={`${t.flowStep} ${
            wizard.step === "phone" ? 1 : wizard.step === "otp" ? 2 : 3
          } ${t.flowStepOf} 3`}
        >
          {wizard.step === "phone"
            ? t.forgotIntro
            : wizard.step === "otp"
              ? t.otpSentNotice
              : t.forgotResetWarning}
        </HintPanel>
      }
    >
        {wizard.step === "phone" && (
              <>
                <h1 className="auth-title">{t.forgotTitle}</h1>
                <form onSubmit={wizard.handlePhoneSubmit}>
                  <div className="form-group">
                    <FieldLabel htmlFor="forgot-phone" hint={t.phoneHint}>
                      {t.phoneLabel}
                    </FieldLabel>
                    <input
                      id="forgot-phone"
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
                    {t.forgotSendCode}
                  </button>
                </form>
              </>
            )}

            {wizard.step === "otp" && (
              <OtpStep
                phoneE164={wizard.phone}
                purpose="password_reset"
                initialResendAfterSeconds={wizard.resendAfterSeconds}
                onVerified={({ proofToken, expiresAt, accountMode }) => {
                  // Soft handoff: unknown phone → finish on /register with the
                  // reminted register-purpose proof. Copy stays neutral (no
                  // "account does not exist").
                  if (accountMode === "created") {
                    clearOtpProof("password_reset");
                    saveOtpProof("register", {
                      proofToken,
                      expiresAt,
                      phone: wizard.phone,
                    });
                    navigate("/register", { replace: true });
                    return;
                  }
                  wizard.onOtpVerified({ proofToken, expiresAt, accountMode });
                }}
                turnstileSiteKey={wizard.turnstileSiteKey}
                onBack={wizard.backToPhone}
              />
            )}

            {wizard.step === "password" && (
              <>
                <h1 className="auth-title">{t.newPasswordLabel}</h1>
                <form onSubmit={handlePasswordSubmit}>
                  <PasswordField
                    id="reset-password"
                    label={t.newPasswordLabel}
                    value={newPassword}
                    onChange={setNewPassword}
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
                    {wizard.submitting ? t.forgotSubmitting : t.forgotSubmit}
                  </button>
                </form>
                <div className="auth-links">
                  <button type="button" className="link-btn" onClick={wizard.backToOtp}>
                    {t.backButton}
                  </button>
                </div>
              </>
            )}

        <div className="auth-links">
          <Link to="/">{t.backHome}</Link>
        </div>
    </AuthLayout>
  );
}
