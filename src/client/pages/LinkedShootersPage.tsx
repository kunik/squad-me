import { AccountShell } from "../components/AccountShell";
import { useLocale } from "../locale";

/** «Пов’язані стрільці» — profiles I register / who can register me. */
export function LinkedShootersPage() {
  const { t } = useLocale();

  return (
    <AccountShell>
      <div className="profile-page__block profile-page__placeholder">
        <h1 className="profile-page__section-title">{t.profileMenuLinkedShooters}</h1>
        <h2 className="profile-page__subheading">{t.profileLinkedIRegister}</h2>
        <p className="profile-page__hint">{t.profileMatchesComingSoon}</p>
        <h2 className="profile-page__subheading">{t.profileLinkedRegisterMe}</h2>
        <p className="profile-page__hint">{t.profileMatchesComingSoon}</p>
      </div>
    </AccountShell>
  );
}
