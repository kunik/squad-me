import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { BrandMark } from "./BrandLogo";
import { BrandWordmark } from "./BrandWordmark";
import { ProfileSideMenu } from "./ProfileSideMenu";
import { SidebarFooter } from "./SidebarFooter";
import { useAuth } from "../auth";
import { useSidebarScrollLock } from "../hooks/useSidebarScrollLock";
import { useLocale } from "../locale";
import { AUTHENTICATED_HOME_PATH, getProfile } from "../lib/authApi";
import { profileSectionFromPath } from "../lib/profileMenu";
import {
  prefersReducedMotion,
  readSidebarRail,
  SIDEBAR_WIDTH_MS,
  SIDEBAR_WORDMARK_MS,
  writeSidebarRail,
} from "../lib/sidebarRail";
import { isDesktopShell } from "../lib/theme";

type AccountShellProps = {
  /** Optional onboarding hint (rendered as a Gentelella banner above content). */
  hint?: ReactNode;
  /**
   * When provided (including `null`), skips the shell’s own profile fetch and
   * uses this nickname (ProfilePage keeps the live form copy in sync).
   */
  nickname?: string | null;
  /** Topbar breadcrumb / page label; defaults to the active section name. */
  title?: string;
  children: ReactNode;
};

/**
 * Authenticated shell built on Gentelella v4's real layout: dark fixed sidebar
 * (`.sidebar`), translucent `.topbar`, and a `.main` / `.page-wrapper` content
 * column. Language, theme, and logout live in the sidebar footer.
 */
export function AccountShell({
  hint,
  nickname: nicknameProp,
  title,
  children,
}: AccountShellProps) {
  const { t } = useLocale();
  const { account, loading: authLoading } = useAuth();
  const { pathname } = useLocation();
  const nicknameControlled = nicknameProp !== undefined;
  const [fetchedNickname, setFetchedNickname] = useState<string | null>(null);
  const [loadingNickname, setLoadingNickname] = useState(!nicknameControlled);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarRail, setSidebarRail] = useState(readSidebarRail);
  /** Wordmark hidden while collapsing / collapsed / expanding (before fade-in). */
  const [wordmarkOut, setWordmarkOut] = useState(() => readSidebarRail());
  const [railBusy, setRailBusy] = useState(false);
  const railTimerRef = useRef<number | null>(null);

  const accountId = account?.id;
  useEffect(() => {
    if (nicknameControlled || authLoading || !accountId) return;
    let cancelled = false;
    setLoadingNickname(true);
    (async () => {
      try {
        const result = await getProfile();
        if (cancelled) return;
        if (result.ok) {
          setFetchedNickname(result.data.profile.nickname?.trim() || null);
        } else {
          setFetchedNickname(null);
        }
      } finally {
        if (!cancelled) setLoadingNickname(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nicknameControlled, authLoading, accountId]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.classList.toggle("sidebar-rail", sidebarRail);
    return () => {
      document.body.classList.remove("sidebar-rail");
    };
  }, [sidebarRail]);

  useEffect(() => {
    return () => {
      if (railTimerRef.current != null) {
        window.clearTimeout(railTimerRef.current);
      }
    };
  }, []);

  useSidebarScrollLock(sidebarOpen);

  const nickname = nicknameControlled ? nicknameProp : fetchedNickname;
  const showNickname = nicknameControlled || !loadingNickname;
  const section = profileSectionFromPath(pathname);
  const pageTitle =
    title ??
    (section === "matches"
      ? t.profileMenuMatches
      : section === "linked"
        ? t.profileMenuLinkedShooters
        : t.profileMenuMyProfile);

  if (authLoading || !account) {
    return (
      <main className="main">
        <div className="main__hex" aria-hidden="true" />
        <div className="page-wrapper" />
      </main>
    );
  }

  function handleSidebarToggle() {
    if (!isDesktopShell()) {
      setSidebarOpen((open) => !open);
      return;
    }
    if (railBusy) return;

    const reduced = prefersReducedMotion();
    if (railTimerRef.current != null) {
      window.clearTimeout(railTimerRef.current);
      railTimerRef.current = null;
    }

    if (!sidebarRail) {
      // Collapse: hide wordmark, then shrink sidebar.
      setWordmarkOut(true);
      if (reduced) {
        setSidebarRail(true);
        writeSidebarRail(true);
        return;
      }
      setRailBusy(true);
      railTimerRef.current = window.setTimeout(() => {
        setSidebarRail(true);
        writeSidebarRail(true);
        setRailBusy(false);
        railTimerRef.current = null;
      }, SIDEBAR_WORDMARK_MS);
      return;
    }

    // Expand: grow sidebar, then fade wordmark in.
    setSidebarRail(false);
    writeSidebarRail(false);
    if (reduced) {
      setWordmarkOut(false);
      return;
    }
    setRailBusy(true);
    setWordmarkOut(true);
    railTimerRef.current = window.setTimeout(() => {
      setWordmarkOut(false);
      setRailBusy(false);
      railTimerRef.current = null;
    }, SIDEBAR_WIDTH_MS);
  }

  return (
    <>
      <aside className={`sidebar${sidebarOpen ? " open" : ""}`} aria-label={t.profileMenuLabel}>
        <Link
          to={AUTHENTICATED_HOME_PATH}
          className={`sidebar-brand${wordmarkOut ? " is-wordmark-out" : ""}`}
          aria-label="Squad Me"
        >
          <BrandMark size={28} on="dark" />
          <BrandWordmark />
        </Link>

        <ProfileSideMenu />

        <SidebarFooter
          nickname={nickname ?? null}
          showNickname={showNickname}
          phoneE164={account.phoneE164}
        />
      </aside>

      <div
        className="sidebar-backdrop"
        hidden={!sidebarOpen}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <header className="topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="sidebar-toggle"
            aria-label={t.profileMenuLabel}
            aria-expanded={sidebarOpen}
            aria-pressed={sidebarRail}
            onClick={handleSidebarToggle}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <h1 className="current" aria-current="page">
              {pageTitle}
            </h1>
          </nav>
        </div>
      </header>

      <main className="main">
        <div className="main__hex" aria-hidden="true" />
        <div className="page-wrapper">
          {hint}
          {children}
        </div>
      </main>
    </>
  );
}
