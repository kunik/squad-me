import { Link } from "react-router-dom";
import { LangSwitch } from "../components/LangSwitch";
import { ThemeSwitch } from "../components/ThemeSwitch";
import { useLocale } from "../locale";

export function HomePage() {
  const { t } = useLocale();

  return (
    <div className="home">
      <div className="home-topbar">
        <span className="brand">
          <img src="/logo-mark.svg" alt="" width={26} height={26} />
          <span className="brand-name home-brand-name">Squad Me</span>
        </span>
        <div className="home-topbar-controls">
          <ThemeSwitch compact />
          <LangSwitch />
        </div>
      </div>
      <main className="home-hero">
        <img className="hero-logo" src="/logo-full.svg" alt="Squad Me" width={794} height={177} />
        <p>{t.support}</p>
        <div className="cta">
          <Link to="/login" className="btn btn-primary btn-lg">
            {t.login}
          </Link>
          <p className="muted home-invite-hint">{t.inviteHint}</p>
        </div>
      </main>
    </div>
  );
}
