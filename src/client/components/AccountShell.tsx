import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { PublicChrome } from "./PublicChrome";
import { ProfileSideMenu } from "./ProfileSideMenu";
import { useAuth } from "../auth";
import { useLocale } from "../locale";
import { getProfile } from "../lib/authApi";
import { PROFILE_PATH } from "../lib/profileMenu";
import { PROFILE_ANCHOR } from "../hooks/useProfileScrollSpy";

type AccountShellProps = {
  /** Optional onboarding HintPanel in the fixed top chrome. */
  hint?: ReactNode;
  /** Active in-page profile anchor (only meaningful on `/profile`). */
  activeAnchor?: string;
  /** Scroll handler when already on `/profile`; otherwise unused. */
  onScrollToAnchor?: (id: string) => void;
  /**
   * When provided (including `null`), skips the shell’s own profile fetch and
   * uses this nickname (ProfilePage keeps the live form copy in sync).
   */
  nickname?: string | null;
  children: ReactNode;
};

/**
 * Shared chrome for `/matches`, `/linked-shooters`, and `/profile`:
 * avatar + nickname + accordion side menu + main pane.
 */
export function AccountShell({
  hint,
  activeAnchor = "",
  onScrollToAnchor,
  nickname: nicknameProp,
  children,
}: AccountShellProps) {
  const { t } = useLocale();
  const { account, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const nicknameControlled = nicknameProp !== undefined;
  const [fetchedNickname, setFetchedNickname] = useState<string | null>(null);
  const [loadingNickname, setLoadingNickname] = useState(!nicknameControlled);

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

  const nickname = nicknameControlled ? nicknameProp : fetchedNickname;
  const showNickname = nicknameControlled || !loadingNickname;

  if (authLoading || !account) {
    return (
      <>
        <PublicChrome />
        <main className="profile-page" />
      </>
    );
  }

  return (
    <>
      <PublicChrome hint={hint} />
      <main className="profile-page">
        <aside className="profile-page__aside">
          <div className="profile-page__identity">
            <div className="profile-page__avatar" aria-hidden="true">
              <img
                className="profile-page__avatar-img"
                src="/avatar-default.png"
                alt=""
                width={160}
                height={160}
              />
            </div>
            {showNickname && nickname ? (
              <p className="profile-page__nickname">{nickname}</p>
            ) : showNickname ? (
              <button
                type="button"
                className="auth-page__link auth-page__link--button profile-page__nickname is-empty"
                onClick={() => navigate(`${PROFILE_PATH}#${PROFILE_ANCHOR}`)}
              >
                {t.profileAddNickname}
              </button>
            ) : null}
          </div>
          <ProfileSideMenu
            activeAnchor={activeAnchor}
            onScrollToAnchor={onScrollToAnchor}
          />
        </aside>
        <div className="profile-page__main">{children}</div>
      </main>
    </>
  );
}
