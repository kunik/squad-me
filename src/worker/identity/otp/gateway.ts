import type { OtpProvider, OtpSendOutcome } from "./types";

/**
 * Telegram Gateway adapter (https://gateway.telegram.org/) — verify-only,
 * per docs/plans/auth-registration-plan.md. Never invoked with a real token
 * in tests or local dev (see otp/fake.ts); requires TELEGRAM_GATEWAY_TOKEN
 * from a manually-provisioned account (docs/provision.md).
 */
export class GatewayOtpProvider implements OtpProvider {
  readonly name = "gateway" as const;

  constructor(private readonly token: string) {}

  async send(phoneE164: string, code: string): Promise<OtpSendOutcome> {
    const response = await fetch(
      "https://gatewayapi.telegram.org/sendVerificationMessage",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          phone_number: phoneE164,
          code,
          code_length: code.length,
        }),
      },
    );
    const data = (await response.json()) as {
      ok?: boolean;
      result?: { request_id?: string };
      error?: string;
    };
    if (!data.ok || !data.result?.request_id) {
      throw new Error(`telegram gateway send failed: ${data.error ?? "unknown"}`);
    }
    return { providerRef: data.result.request_id };
  }
}
