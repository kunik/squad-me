import { Link } from "react-router-dom";
import { useLocale } from "../locale";
import { PROFILE_PATH } from "../lib/profileMenu";
import { useLogout } from "../hooks/useLogout";
import { maskPhoneE164 } from "../lib/maskIdentity";

import { UserAvatar } from "./UserAvatar";

type SidebarFooterProps = {
  nickname: string | null;
  showNickname: boolean;
  phoneE164: string;
};

/**
 * Gentelella `.sidebar-footer`: profile link and logout in one row
 * (lang/theme live under the profile avatar identity block).
 */
export function SidebarFooter({
  nickname,
  showNickname,
  phoneE164,
}: SidebarFooterProps) {
  const { t } = useLocale();
  const { logout, busy, error } = useLogout();
  const maskedPhone = maskPhoneE164(phoneE164);

  return (
    <div className="sidebar-footer">
      <div className="sidebar-footer-row">
        <Link
          to={PROFILE_PATH}
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
            <div className="role">{maskedPhone}</div>
          </div>
        </Link>

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
