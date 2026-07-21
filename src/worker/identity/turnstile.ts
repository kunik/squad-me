import type { Env } from "../env";

/**
 * Pluggable Turnstile verification hook for `POST /api/auth/phone/otp/start`.
 * `otp/start` triggers a real SMS/Gateway spend per call, so it must be
 * behind Turnstile before public launch (see docs/plans/auth-registration-plan.md
 * and docs/provision.md). Real site/secret keys are a manual follow-up —
 * this hook lets that wiring land with zero code changes.
 */
export interface TurnstileVerifier {
  verify(token: string | null, remoteIp: string): Promise<boolean>;
}

/** Used automatically when no secret key is configured (local/dev/tests). */
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

export function getTurnstileVerifier(env: Env): TurnstileVerifier {
  if (env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SECRET_KEY.length > 0) {
    return new CloudflareTurnstileVerifier(env.TURNSTILE_SECRET_KEY);
  }
  return new NoopTurnstileVerifier();
}
