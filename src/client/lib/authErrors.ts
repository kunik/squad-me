import type { Messages } from "../i18n";

const ERROR_KEY_MAP: Record<string, keyof Messages> = {
  invalid_phone: "authErrorInvalidPhone",
  invalid_request: "authErrorInvalidRequest",
  invalid_code: "authErrorInvalidCode",
  locked: "authErrorLocked",
  expired: "authErrorExpired",
  no_challenge: "authErrorNoChallenge",
  rate_limited: "authErrorRateLimited",
  invalid_password: "authErrorInvalidPassword",
  invalid_or_expired_proof: "authErrorInvalidProof",
  phone_already_registered: "authErrorPhoneRegistered",
  invalid_credentials: "authErrorInvalidCredentials",
  turnstile_failed: "authErrorTurnstileFailed",
  invalid_profile: "authErrorInvalidProfile",
  invalid_email: "authErrorInvalidEmail",
  email_already_used: "authErrorEmailAlreadyUsed",
  network_error: "authErrorNetwork",
};

/** Maps a server auth error code to localized text, falling back to a generic message. */
export function translateAuthError(code: string, t: Messages): string {
  const key = ERROR_KEY_MAP[code];
  if (!key) {
    return t.authErrorGeneric;
  }
  const value = t[key];
  return typeof value === "string" ? value : t.authErrorGeneric;
}
