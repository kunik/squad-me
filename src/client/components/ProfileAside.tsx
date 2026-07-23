import { type RefObject } from "react";
import { Link } from "react-router-dom";
import { useLocale } from "../locale";
import { profileInPageNavItems, PROFILE_PATH } from "../lib/profileMenu";
import { ACTIONS_ANCHOR } from "../hooks/useProfileScrollSpy";
import { UserAvatar } from "./UserAvatar";

type ProfileAsideProps = {
  nickname: string | null;
  showNickname: boolean;
  activeAnchor: string;
  showNotifications?: boolean;
  onNavigate: (anchorId: string) => void;
  onDeleteClick: () => void;
  deleteBusy?: boolean;
  deleteTriggerRef?: RefObject<HTMLButtonElement | null>;
};

/**
 * Profile page right column: avatar, nickname, in-page section nav, security actions.
 */
export function ProfileAside({
  nickname,
  showNickname,
  activeAnchor,
  showNotifications = true,
  onNavigate,
  onDeleteClick,
  deleteBusy = false,
  deleteTriggerRef,
}: ProfileAsideProps) {
  const { t } = useLocale();
  const navItems = profileInPageNavItems({ showNotifications });
  const displayName = showNickname ? nickname?.trim() || t.profileAddNickname : "\u00a0";

  return (
    <aside className="profile-aside" aria-label={t.profileAsideLabel}>
      <div className="card profile-aside-card">
        <div className="card-body profile-aside-identity">
          <UserAvatar size="lg" alt={t.profileAvatarAlt} />
          <p className={`profile-aside-name${nickname?.trim() ? "" : " is-empty"}`}>{displayName}</p>
        </div>
        <nav className="profile-aside-nav" aria-label={t.profileMenuLabel}>
          {navItems.map((item) => {
            const label = t[item.labelKey] as string;
            const isActive = activeAnchor === item.id;
            return (
              <a
                key={item.id}
                href={`${PROFILE_PATH}#${item.id}`}
                className={`profile-aside-link${isActive ? " active" : ""}`}
                aria-current={isActive ? "location" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(item.id);
                }}
              >
                {label}
              </a>
            );
          })}
        </nav>
      </div>

      <section
        id={ACTIONS_ANCHOR}
        className="card profile-aside-security profile-section"
        aria-labelledby="profile-aside-security-heading"
      >
        <div className="card-header">
          <div id="profile-aside-security-heading" className="card-title">
            {t.profileMenuActions}
          </div>
        </div>
        <div className="card-body profile-aside-security-body">
          <Link className="btn btn-ghost btn-block" to="/change-phone">
            {t.profileChangePhone}
          </Link>
          <Link className="btn btn-ghost btn-block" to="/forgot-password">
            {t.profileChangePassword}
          </Link>
          <button
            type="button"
            className="btn btn-ghost btn-block"
            disabled
            title={t.profileClearSessionsSoon}
          >
            {t.profileClearSessions}
            <span className="profile-aside-soon">{t.profileClearSessionsSoon}</span>
          </button>
          <button
            ref={deleteTriggerRef}
            type="button"
            className="btn btn-danger btn-block"
            disabled={deleteBusy}
            onClick={onDeleteClick}
          >
            {t.profileDelete}
          </button>
        </div>
      </section>
    </aside>
  );
}
