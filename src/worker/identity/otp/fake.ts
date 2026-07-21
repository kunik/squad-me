import { maskPhone } from "../session";
import type { OtpProvider, OtpSendOutcome } from "./types";

/**
 * Dev/test sink provider — logs the code instead of sending it.
 * Gated by `OTP_SINK_MODE=log`; this MUST be the only provider exercised in
 * vitest/CI and local dev so zero real SMS/Gateway calls happen there.
 */
export class FakeOtpProvider implements OtpProvider {
  readonly name = "fake" as const;

  async send(phoneE164: string, code: string): Promise<OtpSendOutcome> {
    // Intentional dev/test sink output — this is the whole point of OTP_SINK_MODE=log.
    console.log(
      `[otp:fake] phone=${maskPhone(phoneE164)} code=${code} (not sent — OTP_SINK_MODE=log)`,
    );
    return { providerRef: `fake:${crypto.randomUUID()}` };
  }
}
