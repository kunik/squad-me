import { PROFILE_PATH } from "./profileMenu";

export type AuthExitTarget = {
  to: string;
  labelKey: "backHome" | "backToProfile";
};

/** Footer exit on auth forms: profile when signed in, home when guest.
 *  Shared by AuthExitLink — keep all AuthLayout pages on this helper (AUTH-006).
 */
export function authExitTarget(loggedIn: boolean): AuthExitTarget {
  return loggedIn
    ? { to: PROFILE_PATH, labelKey: "backToProfile" }
    : { to: "/", labelKey: "backHome" };
}
