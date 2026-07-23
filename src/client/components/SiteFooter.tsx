import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import { AUTHENTICATED_HOME_PATH } from "../lib/authApi";
import {
  LINKED_SHOOTERS_PATH,
  MATCHES_PATH,
  PROFILE_PATH,
} from "../lib/profileMenu";
import { useLocale } from "../locale";

const PRIVACY_PATH = "/privacy";
const TERMS_PATH = "/terms";
const CONTACT_PATH = "/contact";

/** Monochrome full lockup for always-dark site footer (transparent PNG). */
export const LOGO_FULL_MONO = "/logo-full-mono.png";

/** Paths for onboarding guard + public legal/contact routes. */
export const SITE_FOOTER_PUBLIC_PATHS = [
  PRIVACY_PATH,
  TERMS_PATH,
  CONTACT_PATH,
] as const;

type SiteChromeProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Pushes the site footer to at least one viewport below the page top.
 * Short pages keep empty space so the footer stays below the fold.
 */
export function SiteChrome({ children, className }: SiteChromeProps) {
  return (
    <div className={className ? `site-chrome ${className}` : "site-chrome"}>
      <div className="site-chrome__body">{children}</div>
      <SiteFooter />
    </div>
  );
}

/**
 * Always-dark site footer (independent of `data-theme`). Uses the monochrome
 * full lockup (`logo-full-mono.png`) — not theme-aware brand chrome.
 */
export function SiteFooter() {
  const { t } = useLocale();
  const { account } = useAuth();
  const year = new Date().getFullYear();
  const homeTo = account ? AUTHENTICATED_HOME_PATH : "/";

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <Link to={homeTo} className="site-footer__logo" aria-label="Squad Me">
            <img
              className="site-footer__logo-img"
              src={LOGO_FULL_MONO}
              alt=""
              width={158}
              height={36}
              decoding="async"
            />
          </Link>
          <p className="site-footer__tagline">{t.support}</p>
        </div>

        <nav className="site-footer__col" aria-labelledby="site-footer-nav">
          <h2 id="site-footer-nav" className="site-footer__heading">
            {t.footerNavHeading}
          </h2>
          <ul className="site-footer__list">
            {account ? (
              <>
                <li>
                  <Link to={MATCHES_PATH}>{t.profileMenuMatches}</Link>
                </li>
                <li>
                  <Link to={LINKED_SHOOTERS_PATH}>{t.profileMenuLinkedShooters}</Link>
                </li>
                <li>
                  <Link to={PROFILE_PATH}>{t.profileMenuMyProfile}</Link>
                </li>
              </>
            ) : (
              <>
                <li>
                  <Link to="/">{t.footerHome}</Link>
                </li>
                <li>
                  <Link to="/login">{t.login}</Link>
                </li>
                <li>
                  <Link to="/register">{t.registerTitle}</Link>
                </li>
              </>
            )}
          </ul>
        </nav>

        <nav className="site-footer__col" aria-labelledby="site-footer-legal">
          <h2 id="site-footer-legal" className="site-footer__heading">
            {t.footerLegalHeading}
          </h2>
          <ul className="site-footer__list">
            <li>
              <Link to={PRIVACY_PATH}>{t.footerPrivacy}</Link>
            </li>
            <li>
              <Link to={TERMS_PATH}>{t.footerTerms}</Link>
            </li>
            <li>
              <Link to={CONTACT_PATH}>{t.footerContact}</Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="site-footer__bar">
        <p className="site-footer__copy">
          © {year} Squad Me
        </p>
      </div>
    </footer>
  );
}
