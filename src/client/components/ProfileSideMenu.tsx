import { Link, useLocation } from "react-router-dom";
import { useLocale } from "../locale";
import {
  pathForProfileSection,
  PROFILE_MENU_GROUPS,
  profileSectionFromPath,
} from "../lib/profileMenu";

/**
 * Gentelella `.sidebar-nav`: flat `.nav-link` rows for routed account screens.
 * Profile is opened from the sidebar footer avatar, not from this menu.
 */
export function ProfileSideMenu() {
  const { t } = useLocale();
  const { pathname } = useLocation();
  const activeSection = profileSectionFromPath(pathname);

  return (
    <nav className="sidebar-nav" aria-label={t.profileMenuLabel}>
      <div className="nav-group">
        <div className="nav-label">{t.profileMenuLabel}</div>
        {PROFILE_MENU_GROUPS.map((group) => {
          const onScreen = group.section === activeSection;
          const label = t[group.labelKey] as string;

          return (
            <Link
              key={group.section}
              to={pathForProfileSection(group.section)}
              className={`nav-link${onScreen ? " active" : ""}`}
              aria-current={onScreen ? "page" : undefined}
              data-rail-label={label}
              title={label}
            >
              <NavIcon section={group.section} />
              <span className="nav-text">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function NavIcon({ section }: { section: string }) {
  if (section === "matches") {
    return (
      <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="4" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="10" width="7" height="11" rx="1.5" />
      </svg>
    );
  }
  return (
    <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
    </svg>
  );
}
