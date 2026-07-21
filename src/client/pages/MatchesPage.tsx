import { AccountShell } from "../components/AccountShell";
import { useLocale } from "../locale";

/** Authenticated home — «Мої матчі». */
export function MatchesPage() {
  const { t } = useLocale();

  return (
    <AccountShell>
      <div className="profile-page__block profile-page__placeholder">
        <h1 className="profile-page__section-title">{t.profileMenuMatches}</h1>
        <p className="profile-page__hint">{t.profileMatchesComingSoon}</p>
      </div>
    </AccountShell>
  );
}
