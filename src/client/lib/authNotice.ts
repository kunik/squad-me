export const AUTH_LOGIN_NOTICE_PARAM = "notice";

export type AuthLoginNotice = "phone_changed" | "password_changed";

const AUTH_LOGIN_NOTICES = new Set<string>(["phone_changed", "password_changed"]);

export function parseAuthLoginNotice(value: string | null): AuthLoginNotice | null {
  if (!value || !AUTH_LOGIN_NOTICES.has(value)) {
    return null;
  }
  return value as AuthLoginNotice;
}

export function loginPathWithNotice(notice: AuthLoginNotice): string {
  return `/login?${AUTH_LOGIN_NOTICE_PARAM}=${notice}`;
}

type PendingSignOutLogin = { notice: AuthLoginNotice; fromPath: string };

/** Set before clearing the session on a RequireAuth route (e.g. `/change-phone`). */
let pendingSignOutLogin: PendingSignOutLogin | null = null;

export function prepareSignOutLoginRedirect(notice: AuthLoginNotice, fromPath: string): void {
  pendingSignOutLogin = { notice, fromPath };
}

export function consumeSignOutLoginRedirect(fromPath: string): string | null {
  if (!pendingSignOutLogin || pendingSignOutLogin.fromPath !== fromPath) {
    return null;
  }
  const path = loginPathWithNotice(pendingSignOutLogin.notice);
  pendingSignOutLogin = null;
  return path;
}

/** RequireAuth guest redirect: sign-out notice wins over `?next=` for that path. */
export function buildRequireAuthLoginRedirect(pathname: string, search: string): string {
  const signOutRedirect = consumeSignOutLoginRedirect(pathname);
  if (signOutRedirect) {
    return signOutRedirect;
  }
  const next = `${pathname}${search}`;
  const qs = next && next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
  return `/login${qs}`;
}
