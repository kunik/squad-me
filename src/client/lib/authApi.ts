export type OtpPurpose = "register" | "password_reset" | "change_phone";

export type AccountView = {
  id: string;
  phoneE164: string;
  phoneVerifiedAt: string;
  email: string | null;
};

export type Gender = "male" | "female";

export type PowerFactor = "minor" | "major";

export type DisciplineBlock = {
  enabled: boolean;
  division: string | null;
  powerFactor: PowerFactor | null;
};

/**
 * Full profile upsert body, plus the narrow nickname section used after
 * registration. `gender`/`birthDate` must be sent together when present.
 */
export type ProfileInput = {
  section?: "nickname" | "profile" | "disciplines";
  firstNameUa?: string | null;
  lastNameUa?: string | null;
  firstNameEn?: string | null;
  lastNameEn?: string | null;
  nickname?: string | null;
  gender?: Gender | null;
  birthDate?: string | null;
  upsfMember?: boolean;
  region?: string | null;
  city?: string | null;
  /** Temporary free-text placeholder until a real `Club` entity exists. */
  club?: string | null;
  ipscMember?: boolean;
  ipscMemberNumber?: string | null;
  ipscRegion?: string | null;
  pistol?: DisciplineBlock;
  carbine?: DisciplineBlock;
  pccMiniRifle?: DisciplineBlock;
  shotgun?: DisciplineBlock;
};

export type ProfileView = {
  firstNameUa: string | null;
  lastNameUa: string | null;
  firstNameEn: string | null;
  lastNameEn: string | null;
  nickname: string | null;
  gender: Gender | null;
  birthDate: string | null;
  upsfMember: boolean;
  region: string | null;
  city: string | null;
  club: string | null;
  ipscMember: boolean;
  ipscMemberNumber: string | null;
  ipscRegion: string | null;
  pistol: DisciplineBlock;
  carbine: DisciplineBlock;
  pccMiniRifle: DisciplineBlock;
  shotgun: DisciplineBlock;
  profileCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AuthApiError = {
  ok: false;
  status: number;
  error: string;
  /** Present on some `invalid_profile` responses from `POST /api/profile`. */
  field?: string;
  retryAfterSeconds?: number;
};

export type AuthApiSuccess<T> = { ok: true; data: T };

export type AuthApiResult<T> = AuthApiSuccess<T> | AuthApiError;

/** Shared fetch + error shaping for GET/POST/DELETE auth API calls. */
export async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<AuthApiResult<T>> {
  try {
    const headers = new Headers(init.headers);
    if (init.body !== undefined && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    const response = await fetch(path, {
      ...init,
      headers,
      credentials: "same-origin",
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const retryAfterHeader = response.headers.get("Retry-After");
      return {
        ok: false,
        status: response.status,
        error: typeof data.error === "string" ? data.error : "generic",
        field: typeof data.field === "string" ? data.field : undefined,
        retryAfterSeconds: retryAfterHeader ? Number(retryAfterHeader) : undefined,
      };
    }
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, status: 0, error: "network_error" };
  }
}

function postJson<T>(path: string, body: unknown): Promise<AuthApiResult<T>> {
  return requestJson<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function otpStart(
  phone: string,
  purpose: OtpPurpose,
  turnstileToken?: string,
): Promise<AuthApiResult<{ challengeId: string; expiresAt: string; resendAfterSeconds: number }>> {
  return postJson("/api/auth/phone/otp/start", { phone, purpose, turnstileToken });
}

export function otpVerify(
  phone: string,
  purpose: OtpPurpose,
  code: string,
): Promise<
  AuthApiResult<{ proofToken: string; expiresAt: string; accountMode?: AccountMode }>
> {
  return postJson("/api/auth/phone/otp/verify", { phone, purpose, code });
}

export function register(
  proofToken: string,
  password: string,
  nickname: string,
): Promise<AuthApiResult<{ account: AccountView; accountMode: AccountMode }>> {
  return postJson("/api/auth/register", { proofToken, password, nickname });
}

export function login(
  phone: string,
  password: string,
): Promise<AuthApiResult<{ account: AccountView }>> {
  return postJson("/api/auth/login", { phone, password });
}

export function logout(): Promise<AuthApiResult<{ ok: true }>> {
  return postJson("/api/auth/logout", {});
}

export function deleteAccount(): Promise<AuthApiResult<{ ok: true }>> {
  return requestJson("/api/auth/account", { method: "DELETE" });
}

export function passwordReset(
  proofToken: string,
  newPassword: string,
): Promise<AuthApiResult<{ ok: true }>> {
  return postJson("/api/auth/password/reset", { proofToken, newPassword });
}

export function phoneChange(
  proofToken: string,
): Promise<AuthApiResult<{ ok: true; phoneE164: string }>> {
  return postJson("/api/auth/phone/change", { proofToken });
}

export type OnboardingStep = "profile" | "disciplines" | "email";
export type AccountMode = "created" | "password_reset";

export type MeResponse = {
  account: AccountView;
  /**
   * Next unfinished post-auth onboarding step, computed on the server.
   * `null` when profile + disciplines + email prompts are done (saved or dismissed).
   */
  onboardingStep: OnboardingStep | null;
  /** @deprecated Prefer `onboardingStep === "profile"`. Kept for older clients/tests. */
  showProfilePrompt: boolean;
};

export function fetchMe(): Promise<AuthApiResult<MeResponse>> {
  return requestJson("/api/auth/me");
}

/** `404` means the caller's account has no profile yet — a normal, expected case, not an error. */
export function getProfile(): Promise<AuthApiResult<{ profile: ProfileView }>> {
  return requestJson("/api/profile");
}

export function getAuthConfig(): Promise<AuthApiResult<{ turnstileSiteKey: string | null }>> {
  return requestJson("/api/auth/config");
}

export function upsertProfile(
  input: ProfileInput,
): Promise<AuthApiResult<{ profile: ProfileView }>> {
  return postJson("/api/profile", input);
}

export function setAccountEmail(
  email: string,
): Promise<AuthApiResult<{ ok: true; email: string }>> {
  return postJson("/api/auth/account/email", { email });
}

/** Idempotent — safe to call even if already dismissed. */
export function dismissProfilePrompt(): Promise<AuthApiResult<{ ok: true }>> {
  return postJson("/api/auth/account/profile-prompt/dismiss", {});
}

/** Idempotent — safe to call even if already dismissed. */
export function dismissDisciplinesPrompt(): Promise<AuthApiResult<{ ok: true }>> {
  return postJson("/api/auth/account/disciplines-prompt/dismiss", {});
}

/** Idempotent — safe to call even if already dismissed. */
export function dismissEmailPrompt(): Promise<AuthApiResult<{ ok: true }>> {
  return postJson("/api/auth/account/email-prompt/dismiss", {});
}

/** Only ever redirect within the app — never follow an attacker-controlled absolute/`//` URL. */
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  return next;
}
