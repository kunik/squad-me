import type { Env } from "../env";

/**
 * Pluggable Turnstile verification hook for `POST /api/auth/phone/otp/start`.
 * `otp/start` triggers a real SMS/Gateway spend per call, so it must be
 * behind Turnstile before public launch (see docs/plans/auth-registration-plan.md
 * and docs/provision.md).
 */
export interface TurnstileVerifier {
  verify(token: string | null, remoteIp: string): Promise<boolean>;
}

/**
 * Local/test bypass only. Selected when `OTP_SINK_MODE=log` (fake OTP — no
 * provider spend). Live Gateway/Twilio mode without a secret fails closed
 * instead of using this (see {@link getTurnstileVerifier}).
 */
export class NoopTurnstileVerifier implements TurnstileVerifier {
  async verify(_token: string | null, _remoteIp: string): Promise<boolean> {
    return true;
  }
}

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export class CloudflareTurnstileVerifier implements TurnstileVerifier {
  constructor(private readonly secretKey: string) {}

  async verify(token: string | null, remoteIp: string): Promise<boolean> {
    if (!token) {
      return false;
    }
    try {
      const response = await fetch(SITEVERIFY_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: this.secretKey,
          response: token,
          remoteip: remoteIp,
        }),
      });
      const data = (await response.json()) as { success?: boolean };
      return data.success === true;
    } catch {
      // Fail closed: a broken/unreachable siteverify must not silently bypass the check.
      return false;
    }
  }
}

/** True when the intentional local/test Turnstile bypass is allowed. */
export function allowsNoopTurnstile(env: Env): boolean {
  return env.OTP_SINK_MODE === "log";
}

/**
 * Thrown when live OTP is configured (`OTP_SINK_MODE` not `log`) but
 * `TURNSTILE_SECRET_KEY` is missing — refuse rather than spend on SMS/Gateway.
 */
export class TurnstileMisconfiguredError extends Error {
  constructor() {
    super(
      "TURNSTILE_SECRET_KEY is required when OTP_SINK_MODE is not log (live OTP)",
    );
    this.name = "TurnstileMisconfiguredError";
  }
}

/**
 * Returns a verifier, or throws {@link TurnstileMisconfiguredError} when live
 * OTP would run without siteverify.
 */
export function getTurnstileVerifier(env: Env): TurnstileVerifier {
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  if (secret) {
    return new CloudflareTurnstileVerifier(secret);
  }
  if (allowsNoopTurnstile(env)) {
    return new NoopTurnstileVerifier();
  }
  throw new TurnstileMisconfiguredError();
}
