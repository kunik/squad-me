import { type RefObject } from "react";
import { Link } from "react-router-dom";
import { useLocale } from "../locale";
import { LangSwitch } from "./LangSwitch";
import { ThemeSwitch } from "./ThemeSwitch";
import { UserAvatar } from "./UserAvatar";

type ProfileAsideIdentityProps = {
  nickname: string | null;
  showNickname: boolean;
};

type ProfileAsideSecurityProps = {
  onDeleteClick: () => void;
  deleteBusy?: boolean;
  deleteTriggerRef?: RefObject<HTMLButtonElement | null>;
};

type ProfileAsideProps = ProfileAsideIdentityProps & ProfileAsideSecurityProps;

/** Avatar + nickname block for the profile page column. */
export function ProfileAsideIdentity({ nickname, showNickname }: ProfileAsideIdentityProps) {
  const { t } = useLocale();
  const displayName = showNickname ? nickname?.trim() || t.profileAddNickname : "\u00a0";

  return (
    <section className="profile-aside-identity-block" aria-label={t.profileAvatarAlt}>
      <div className="profile-aside-identity">
        <div className="profile-aside-avatar-ring">
          <UserAvatar size="lg" alt={t.profileAvatarAlt} />
        </div>
        <p className={`profile-aside-name${nickname?.trim() ? "" : " is-empty"}`}>{displayName}</p>
        <div className="profile-aside-prefs">
          <LangSwitch />
          <ThemeSwitch compact />
        </div>
      </div>
    </section>
  );
}

/** Security / account actions card (change phone, password, delete). */
export function ProfileAsideSecurity({
  onDeleteClick,
  deleteBusy = false,
  deleteTriggerRef,
}: ProfileAsideSecurityProps) {
  const { t } = useLocale();

  return (
    <section className="card profile-aside-security" aria-labelledby="profile-aside-security-heading">
      <div className="card-header">
        <h2 id="profile-aside-security-heading" className="card-title">
          {t.profileMenuActions}
        </h2>
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
  );
}

/**
 * Profile page right column: identity + security.
 * On ≤1100px the parent layout reorders so identity is first and security last
 * (`display: contents` + flex `order` on `.profile-page-layout`).
 */
export function ProfileAside({
  nickname,
  showNickname,
  onDeleteClick,
  deleteBusy = false,
  deleteTriggerRef,
}: ProfileAsideProps) {
  const { t } = useLocale();

  return (
    <aside className="profile-aside" aria-label={t.profileAsideLabel}>
      <ProfileAsideIdentity nickname={nickname} showNickname={showNickname} />
      <ProfileAsideSecurity
        onDeleteClick={onDeleteClick}
        deleteBusy={deleteBusy}
        deleteTriggerRef={deleteTriggerRef}
      />
    </aside>
  );
}
