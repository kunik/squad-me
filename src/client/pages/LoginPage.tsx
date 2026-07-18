import { Link } from "react-router-dom";
import { PublicAtmosphere } from "../components/PublicAtmosphere";
import { PublicHeader } from "../components/PublicHeader";
import { useLocale } from "../locale";

/** Placeholder until an identity provider is chosen and wired. */
export function LoginPage() {
  const { t } = useLocale();

  return (
    <PublicAtmosphere>
      <PublicHeader />
      <main className="login-placeholder">
        <h1 className="login-placeholder__title">{t.loginTitle}</h1>
        <p className="login-placeholder__body">{t.loginPending}</p>
        <Link to="/" className="btn btn--ghost">
          {t.backHome}
        </Link>
      </main>
    </PublicAtmosphere>
  );
}
