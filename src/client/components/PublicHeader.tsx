import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { useLocale } from "../locale";
import { AUTHENTICATED_HOME_PATH, logout as logoutRequest } from "../lib/authApi";
import type { Locale } from "../i18n";

/** Placeholder until the real notifications inbox (profile section) exists. */
const UNREAD_COUNT = 0;

export function PublicHeader() {
  const { locale, setLocale, t } = useLocale();
  const { account, loading, refresh, setAccount } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onLoginPage = pathname === "/login";

  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  async function handleLogout() {
    setLogoutError(null);
    setLogoutBusy(true);
    try {
      const result = await logoutRequest();
      if (!result.ok) {
        setLogoutError(t.authErrorNetwork);
        return;
      }
      setAccount(null);
      await refresh();
      setMenuOpen(false);
      navigate("/");
    } catch {
      setLogoutError(t.authErrorNetwork);
    } finally {
      setLogoutBusy(false);
    }
  }

  const showLogin = !loading && !account && !onLoginPage;
  const showSession = !loading && Boolean(account);
  const hasUnread = UNREAD_COUNT > 0;
  const brandHome = account ? AUTHENTICATED_HOME_PATH : "/";

  return (
    <header className="public-header">
      <Link to={brandHome} className="public-header__brand" aria-label="Squad Me">
        <picture>
          <source media="(max-width: 639px)" srcSet="/logo-mark.svg" />
          <img
            className="public-header__logo"
            src="/logo-full.svg"
            alt=""
            width={794}
            height={177}
          />
        </picture>
      </Link>

      <div className="user-menu" ref={menuRef}>
        <button
          type="button"
          className="user-menu__trigger"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          aria-label={t.headerMenuLabel}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span
            className={`user-menu__avatar${showSession ? "" : " user-menu__avatar--guest"}`}
            aria-hidden="true"
          >
            {showSession ? (
              <img
                className="user-menu__avatar-img"
                src="/avatar-default.png"
                alt=""
                width={32}
                height={32}
              />
            ) : (
              <ProfileIcon />
            )}
            {hasUnread && (
              <span className="user-menu__badge">{UNREAD_COUNT}</span>
            )}
          </span>
        </button>

        {menuOpen && (
          <div
            id={menuId}
            className="user-menu__dropdown"
            role="menu"
            aria-label={t.headerMenuLabel}
          >
            {showSession && account && (
              <>
                <div className="user-menu__identity">
                  <div className="user-menu__identity-primary">{account.phoneE164}</div>
                  {account.email && (
                    <div className="user-menu__identity-secondary">{account.email}</div>
                  )}
                </div>

                {/*
                  Design (user-menu.md / AppShell): Profile is the notifications
                  entry — channels live under My profile → Notifications on /profile. Unread count
                  shows as a badge on the avatar.
                */}
                <Link
                  to="/profile"
                  className="user-menu__item"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  {t.headerProfile}
                </Link>
              </>
            )}

            <div
              className="user-menu__lang-row"
              role="none"
            >
              <span className="user-menu__lang-label">{t.headerLanguage}</span>
              <div
                className="lang-switch"
                role="group"
                aria-label={t.headerLanguage}
              >
                <LangButton
                  code="ua"
                  label={t.langUa}
                  active={locale === "ua"}
                  onSelect={(next) => {
                    setLocale(next);
                  }}
                />
                <LangButton
                  code="en"
                  label={t.langEn}
                  active={locale === "en"}
                  onSelect={(next) => {
                    setLocale(next);
                  }}
                />
              </div>
            </div>

            {(showSession || showLogin) && <div className="user-menu__divider" />}
            {logoutError && (
              <p className="user-menu__error" role="alert">
                {logoutError}
              </p>
            )}

            {showSession && (
              <button
                type="button"
                className="user-menu__item user-menu__item--danger"
                role="menuitem"
                onClick={handleLogout}
                disabled={logoutBusy}
              >
                {t.headerLogout}
              </button>
            )}

            {showLogin && (
              <Link
                to="/login"
                className="user-menu__item"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
              >
                {t.login}
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function LangButton({
  code,
  label,
  active,
  onSelect,
}: {
  code: Locale;
  label: string;
  active: boolean;
  onSelect: (locale: Locale) => void;
}) {
  return (
    <button
      type="button"
      className={`lang-switch__btn${active ? " is-active" : ""}`}
      aria-pressed={active}
      onClick={() => onSelect(code)}
    >
      {label}
    </button>
  );
}

function ProfileIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 19.5c1.8-3.2 4.2-4.8 7-4.8s5.2 1.6 7 4.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
