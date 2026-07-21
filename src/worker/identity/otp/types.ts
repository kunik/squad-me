export type OtpProviderName = "gateway" | "twilio" | "fake";

export type OtpSendOutcome = {
  /** Opaque reference for audit/logs — never the code itself. */
  providerRef: string;
};

/**
 * Common contract for OTP channels (Telegram Gateway, Twilio Verify, and the
 * dev/test fake sink). `send` delivers a code we generated (both Telegram
 * Gateway's `sendVerificationMessage` and Twilio Verify's custom-code option
 * support this). Local code-hash comparison in `otp/index.ts` is always the
 * authoritative verification — providers do not expose a separate remote check.
 */
export interface OtpProvider {
  readonly name: OtpProviderName;
  send(phoneE164: string, code: string): Promise<OtpSendOutcome>;
}
