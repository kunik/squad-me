import type { OtpProvider, OtpSendOutcome } from "./types";

/**
 * Twilio Verify adapter — fallback channel when Telegram Gateway has no
 * account / send fails, per docs/plans/auth-registration-plan.md. Never
 * invoked with real credentials in tests or local dev (see otp/fake.ts);
 * requires TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_VERIFY_SERVICE_SID
 * from a manually-provisioned account (docs/provision.md).
 */
export class TwilioOtpProvider implements OtpProvider {
  readonly name = "twilio" as const;

  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly verifyServiceSid: string,
  ) {}

  private authHeader(): string {
    return `Basic ${btoa(`${this.accountSid}:${this.authToken}`)}`;
  }

  async send(phoneE164: string, code: string): Promise<OtpSendOutcome> {
    const response = await fetch(
      `https://verify.twilio.com/v2/Services/${this.verifyServiceSid}/Verifications`,
      {
        method: "POST",
        headers: {
          Authorization: this.authHeader(),
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: phoneE164,
          Channel: "sms",
          CustomCode: code,
        }),
      },
    );
    const data = (await response.json()) as { sid?: string; message?: string };
    if (!data.sid) {
      throw new Error(`twilio verify send failed: ${data.message ?? "unknown"}`);
    }
    return { providerRef: data.sid };
  }
}
