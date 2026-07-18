import { Link } from "react-router-dom";
import { PublicAtmosphere } from "../components/PublicAtmosphere";
import { PublicHeader } from "../components/PublicHeader";
import { useLocale } from "../locale";

export function HomePage() {
  const { t } = useLocale();

  return (
    <PublicAtmosphere>
      <PublicHeader />
      <main className="home-hero">
        <img
          className="home-hero__logo"
          src="/logo-full.svg"
          alt="Squad Me"
          width={794}
          height={177}
        />
        <p className="home-hero__support">{t.support}</p>
        <div className="home-hero__accent" aria-hidden="true" />
        <div className="home-hero__cta">
          <Link to="/login" className="btn btn--primary">
            {t.login}
          </Link>
          <p className="home-hero__hint">{t.inviteHint}</p>
        </div>
      </main>
    </PublicAtmosphere>
  );
}
