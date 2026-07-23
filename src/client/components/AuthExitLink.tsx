import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import { authExitTarget } from "../lib/authExit";
import { useLocale } from "../locale";

/** Auth-form footer exit: «до профілю» when signed in, «на головну» when guest.
 *  Use on every `AuthLayout` page — do not hardcode `/` or `/profile` per form.
 *  Canon: KB design/principles.md § Exit-лінк; AUTH-006.
 */
export function AuthExitLink() {
  const { account, loading } = useAuth();
  const { t } = useLocale();

  if (loading) {
    return null;
  }

  const exit = authExitTarget(Boolean(account));
  return <Link to={exit.to}>{t[exit.labelKey]}</Link>;
}
