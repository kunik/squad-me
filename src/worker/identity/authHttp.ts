import type { Env } from "../env";
import {
  buildClearSessionCookie,
  loadAuthContext,
  readSessionCookie,
  type AuthContext,
} from "./session";

export function json(body: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(body, { status, headers });
}

export function errorResponse(
  error: string,
  status: number,
  extra?: Record<string, unknown>,
  headers?: HeadersInit,
): Response {
  return json({ error, ...extra }, status, headers);
}

export async function readJsonBody<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Defense-in-depth CSRF check for state-changing auth POSTs
 * (SameSite=Lax already blocks most cross-site cookie sends).
 */
export function isOriginAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) {
    // Non-browser clients (tests, curl, mobile) legitimately omit Origin.
    return true;
  }
  try {
    const originHost = new URL(origin).host;
    const requestHost = new URL(request.url).host;
    return originHost === requestHost || originHost === env.APP_HOSTNAME;
  } catch {
    return false;
  }
}

export type RequireAuthResult =
  | { ok: true; auth: AuthContext }
  | { ok: false; response: Response };

/**
 * Session gate shared by authenticated identity handlers.
 * When `clearCookieOnMiss` is set and a stale cookie is present, clears it
 * (used by `/me` so deleted accounts do not leave a sticky session).
 */
export async function requireAuth(
  request: Request,
  env: Env,
  options?: { clearCookieOnMiss?: boolean },
): Promise<RequireAuthResult> {
  const auth = await loadAuthContext(env, request);
  if (auth) {
    return { ok: true, auth };
  }
  if (options?.clearCookieOnMiss && readSessionCookie(request)) {
    return {
      ok: false,
      response: errorResponse("unauthenticated", 401, undefined, {
        "Set-Cookie": buildClearSessionCookie(env),
      }),
    };
  }
  return { ok: false, response: errorResponse("unauthenticated", 401) };
}
