import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  getAuthConfig,
  otpStart,
  type AccountMode,
} from "../lib/authApi";
import { translateAuthError } from "../lib/authErrors";
import { clearOtpProof, loadOtpProof, saveOtpProof } from "../lib/otpProofStorage";
import type { Messages } from "../i18n";

/** Wizard purposes that persist OTP proofs in sessionStorage. */
export type ProofWizardPurpose = "register" | "password_reset";

export type ProofWizardStep = "phone" | "otp" | "password";

export type UseProofWizardOptions = {
  purpose: ProofWizardPurpose;
  t: Messages;
  /** When true, skip restoring a stored proof (e.g. already signed-in register). */
  disableRestore?: boolean;
};

/**
 * Shared phone → Turnstile → OTP → password-step shell for register and
 * password-reset wizards. Callers own the password-step submit + extra fields.
 */
export function useProofWizard({ purpose, t, disableRestore = false }: UseProofWizardOptions) {
  const stored = disableRestore ? null : loadOtpProof(purpose);
  const [step, setStep] = useState<ProofWizardStep>(stored ? "password" : "phone");
  const [phone, setPhone] = useState(stored?.phone ?? "");
  const [resendAfterSeconds, setResendAfterSeconds] = useState(30);
  const [proofToken, setProofToken] = useState<string | null>(stored?.proofToken ?? null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [accountMode, setAccountMode] = useState<AccountMode | null>(null);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileAttempt, setTurnstileAttempt] = useState(0);
  const handleTurnstileToken = useCallback((token: string | null) => setTurnstileToken(token), []);

  useEffect(() => {
    void getAuthConfig().then((result) => {
      if (result.ok) setTurnstileSiteKey(result.data.turnstileSiteKey);
    });
  }, []);

  async function handlePhoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await otpStart(phone, purpose, turnstileToken ?? undefined);
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

  function onOtpVerified(args: {
    proofToken: string;
    expiresAt: string;
    accountMode?: AccountMode;
  }) {
    saveOtpProof(purpose, {
      proofToken: args.proofToken,
      expiresAt: args.expiresAt,
      phone,
    });
    setProofToken(args.proofToken);
    if (args.accountMode) setAccountMode(args.accountMode);
    setStep("password");
  }

  function backToPhone() {
    clearOtpProof(purpose);
    setProofToken(null);
    setStep("phone");
  }

  function backToOtp() {
    setStep("otp");
  }

  function requireProofOrReset(): string | null {
    if (proofToken) return proofToken;
    clearOtpProof(purpose);
    setError(translateAuthError("invalid_or_expired_proof", t));
    setStep("phone");
    return null;
  }

  function clearProof() {
    clearOtpProof(purpose);
    setProofToken(null);
  }

  return {
    step,
    setStep,
    phone,
    setPhone,
    resendAfterSeconds,
    proofToken,
    error,
    setError,
    submitting,
    setSubmitting,
    accountMode,
    setAccountMode,
    turnstileSiteKey,
    turnstileToken,
    turnstileAttempt,
    handleTurnstileToken,
    handlePhoneSubmit,
    onOtpVerified,
    backToPhone,
    backToOtp,
    requireProofOrReset,
    clearProof,
    purpose,
  };
}
