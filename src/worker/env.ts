export type Env = {
  DB: D1Database;
  FILES: R2Bucket;
  JOBS: Queue;
  MATCHES: DurableObjectNamespace;
  ASSETS: Fetcher;
  ENVIRONMENT: "local" | "dev" | "production";
  APP_HOSTNAME: string;
  COMMIT_SHA?: string;

  /** Pepper for session-token and IP hashing (see src/worker/identity/session.ts). */
  SESSION_SIGNING_KEY: string;

  /**
   * `log` forces the fake OTP provider (mandatory for tests/local dev — never
   * call real Gateway/Twilio there). Unset/other value → real provider
   * selection in src/worker/identity/otp/index.ts.
   */
  OTP_SINK_MODE?: "log" | string;
  /** Telegram Gateway (https://gateway.telegram.org/) — primary OTP channel. */
  TELEGRAM_GATEWAY_TOKEN?: string;
  /** Twilio Verify — fallback OTP channel when Gateway is unavailable. */
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_VERIFY_SERVICE_SID?: string;
  /**
   * Cloudflare Turnstile on `otp/start`. Required whenever `OTP_SINK_MODE` is
   * not `log` (live Gateway/Twilio). Missing secret in live mode → otp/start
   * refuses with `turnstile_misconfigured` (fail closed). Noop only when
   * `OTP_SINK_MODE=log`.
   */
  TURNSTILE_SECRET_KEY?: string;
  /** Public widget key returned by `GET /api/auth/config` (safe to expose). */
  TURNSTILE_SITE_KEY?: string;
};
