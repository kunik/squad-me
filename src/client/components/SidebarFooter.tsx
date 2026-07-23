import { Link } from "react-router-dom";
import { useLocale } from "../locale";
import { PROFILE_PATH } from "../lib/profileMenu";
import { PROFILE_ANCHOR } from "../hooks/useProfileScrollSpy";
import { useLogout } from "../hooks/useLogout";
import { LangSwitch } from "./LangSwitch";
import { ThemeSwitch } from "./ThemeSwitch";

import { UserAvatar } from "./UserAvatar";

type SidebarFooterProps = {
  nickname: string | null;
  showNickname: boolean;
  phoneE164: string;
};

/**
 * Gentelella `.sidebar-footer`: profile link, then utility row for
 * language, theme, and logout (replaces the old topbar user menu).
 */
export function SidebarFooter({
  nickname,
  showNickname,
  phoneE164,
}: SidebarFooterProps) {
  const { t } = useLocale();
  const { logout, busy, error } = useLogout();

  return (
    <div className="sidebar-footer">
      <Link
        to={`${PROFILE_PATH}#${PROFILE_ANCHOR}`}
        className="sidebar-user"
        aria-label={t.headerProfile}
        data-rail-label={t.headerProfile}
        title={t.headerProfile}
      >
        <UserAvatar size="sm" className="avatar" alt={t.headerProfile} />
        <div className="sidebar-user-info">
          <div className={`name${nickname ? "" : " is-empty"}`}>
            {showNickname ? nickname || t.profileAddNickname : "\u00a0"}
          </div>
          <div className="role">{phoneE164}</div>
        </div>
      </Link>

      <div className="sidebar-footer-tools">
        <LangSwitch className="sidebar-lang" />
        <ThemeSwitch compact data-rail-label={t.themeToggleLabel} />
        <button
          type="button"
          className="sidebar-logout-btn"
          disabled={busy}
          aria-label={t.headerLogout}
          data-rail-label={t.headerLogout}
          title={t.headerLogout}
          onClick={() => void logout()}
        >
          <svg
            className="sidebar-logout-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          <span className="sidebar-logout-label">{t.headerLogout}</span>
        </button>
      </div>

      {error && (
        <p className="sidebar-footer-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
