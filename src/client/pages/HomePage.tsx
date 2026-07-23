import { Link } from "react-router-dom";
import { BrandFullLogo } from "../components/BrandLogo";
import { GuestBrand, GuestUtilities } from "../components/GuestChrome";
import { SiteChrome } from "../components/SiteFooter";
import { useLocale } from "../locale";

export function HomePage() {
  const { t } = useLocale();

  return (
    <SiteChrome>
      <div className="home">
        <div className="home-topbar">
          <GuestBrand nameClassName="brand-name home-brand-name" />
          <GuestUtilities className="home-topbar-controls" />
        </div>
        <main className="home-hero">
          <BrandFullLogo className="brand-lockup home-hero-brand" markSize={72} />
          <p>{t.support}</p>
          <div className="cta">
            <Link to="/login" className="btn btn-primary btn-lg">
              {t.login}
            </Link>
            <p className="muted home-invite-hint">{t.inviteHint}</p>
          </div>
        </main>
      </div>
    </SiteChrome>
  );
}
