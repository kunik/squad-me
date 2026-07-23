import { Link } from "react-router-dom";
import { SiteChrome } from "../components/SiteFooter";
import { GuestBrand, GuestUtilities } from "../components/GuestChrome";
import { useAuth } from "../auth";
import { AUTHENTICATED_HOME_PATH } from "../lib/authApi";
import { useLocale } from "../locale";

type LegalPageProps = {
  kind: "privacy" | "terms" | "contact";
};

/** Public stub until legal / contact copy is ready. */
export function LegalPage({ kind }: LegalPageProps) {
  const { t } = useLocale();
  const { account } = useAuth();
  const title =
    kind === "privacy"
      ? t.footerPrivacy
      : kind === "terms"
        ? t.footerTerms
        : t.footerContact;
  const copy = kind === "contact" ? t.footerContactStub : t.footerLegalStub;
  const exitTo = account ? AUTHENTICATED_HOME_PATH : "/";
  const exitLabel = account ? t.profileMenuMatches : t.backHome;

  return (
    <SiteChrome>
      <div className="home legal-page">
        <div className="home-topbar">
          <GuestBrand nameClassName="brand-name home-brand-name" />
          <GuestUtilities className="home-topbar-controls" />
        </div>
        <main className="legal-page__body">
          <h1 className="legal-page__title">{title}</h1>
          <p className="legal-page__copy">{copy}</p>
          <p>
            <Link to={exitTo} className="link-btn">
              {exitLabel}
            </Link>
          </p>
        </main>
      </div>
    </SiteChrome>
  );
}
