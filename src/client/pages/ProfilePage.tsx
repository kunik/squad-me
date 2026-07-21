import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppDialog } from "../components/AppDialog";
import { AccountShell } from "../components/AccountShell";
import { ProfileForm } from "../components/ProfileForm";
import { ProfileSectionHeader } from "../components/ProfileSectionHeader";
import { ProfileSummary } from "../components/ProfileSummary";
import {
  NotificationChannelsForm,
  NotificationChannelsSummary,
} from "../components/NotificationChannelsForm";
import { HintPanel } from "../components/HintPanel";
import { useAuth } from "../auth";
import { useLocale } from "../locale";
import {
  dismissDisciplinesPrompt,
  dismissEmailPrompt,
  dismissProfilePrompt,
  deleteAccount,
  getProfile,
  setAccountEmail,
  upsertProfile,
  type ProfileInput,
  type ProfileView,
} from "../lib/authApi";
import { translateAuthError } from "../lib/authErrors";
import { clearOtpProof } from "../lib/otpProofStorage";
import { ProfileContentSection } from "../lib/profileNavigation";
import {
  ACTIONS_ANCHOR,
  DIVISIONS_ANCHOR,
  NOTIFICATIONS_ANCHOR,
  PROFILE_ANCHOR,
  useProfileScrollSpy,
} from "../hooks/useProfileScrollSpy";
import { useUnsavedDiscard } from "../hooks/useUnsavedDiscard";

/**
 * Personal profile on `/profile`: details, divisions, notifications, security.
 * Post-auth onboarding is a HintPanel over this same surface.
 * «Мої матчі» / «Пов’язані стрільці» live on `/matches` and `/linked-shooters`.
 */
export function ProfilePage() {
  const { t } = useLocale();
  const { account, onboardingStep, loading: authLoading, refresh, setAccount } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editingDivisions, setEditingDivisions] = useState(false);
  const [editingNotifications, setEditingNotifications] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [divisionsError, setDivisionsError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const deleteTriggerRef = useRef<HTMLButtonElement>(null);
  const deleteInputRef = useRef<HTMLInputElement>(null);
  const deletingRef = useRef(false);

  const needsProfileStep = onboardingStep === "profile";
  const needsDisciplinesStep = onboardingStep === "disciplines";
  const needsEmailStep = onboardingStep === "email";
  const showProfileEditor = editing;
  const showNotifications = true;

  const {
    profileDirty,
    setProfileDirty,
    divisionsDirty,
    setDivisionsDirty,
    notificationsDirty,
    setNotificationsDirty,
    clearAllDirty,
    discardIntent,
    setDiscardIntent,
    unsavedStayRef,
    closeUnsavedDialog,
    confirmDiscardUnsaved,
  } = useUnsavedDiscard({
    onSkipProfile: () => executeProfileSkip(),
    onSkipDisciplines: () => executeDisciplinesSkip(),
    onNavigate: () => undefined,
    onCancelProfile: () => {
      setEditing(false);
      setError(null);
      setErrorField(null);
    },
    onCancelDivisions: () => {
      setEditingDivisions(false);
      setDivisionsError(null);
    },
    onCancelNotifications: () => {
      setEditingNotifications(false);
      setEmailError(null);
    },
  });

  const { activeAnchor, scrollToAnchor } = useProfileScrollSpy({
    loadingProfile,
    showNotifications,
    showProfileEditor,
    editingDivisions,
    editingNotifications,
    onboardingStep,
  });

  const accountId = account?.id;
  useEffect(() => {
    if (authLoading || !accountId) {
      return;
    }
    let cancelled = false;
    setLoadingProfile(true);
    (async () => {
      try {
        const result = await getProfile();
        if (!cancelled) {
          if (result.ok) setProfile(result.data.profile);
          else if (result.status === 404) setProfile(null);
          else setError(translateAuthError(result.error, t));
        }
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, accountId, t]);

  useEffect(() => {
    setBannerError(null);
  }, [onboardingStep]);

  useEffect(() => {
    if (onboardingStep === "profile") setEditing(true);
    if (onboardingStep === "disciplines") setEditingDivisions(true);
    if (onboardingStep === "email") setEditingNotifications(true);
  }, [onboardingStep]);

  // Deep-link from account shell «add nickname» → open personal-details edit.
  useEffect(() => {
    if (loadingProfile) return;
    if (window.location.hash.slice(1) !== PROFILE_ANCHOR) return;
    if (profile?.nickname?.trim()) return;
    setEditing(true);
  }, [loadingProfile, profile]);

  async function reloadAfterStep() {
    setError(null);
    setErrorField(null);
    setEmailError(null);
    setDivisionsError(null);
    setBannerError(null);
    setSubmitting(false);
    setSkipping(false);
    setEditing(false);
    setEditingDivisions(false);
    setEditingNotifications(false);
    clearAllDirty();
    const nextStep = await refresh();
    if (nextStep === "disciplines") {
      setEditingDivisions(true);
    } else if (nextStep === "email") {
      setEditingNotifications(true);
    }
  }

  async function handleProfileSubmit(values: ProfileInput) {
    const divisionsSave = values.section === "disciplines";
    if (divisionsSave) setDivisionsError(null);
    else {
      setError(null);
      setErrorField(null);
    }
    setSubmitting(true);
    try {
      const result = await upsertProfile(values);
      if (!result.ok) {
        const message = translateAuthError(result.error, t);
        if (divisionsSave) setDivisionsError(message);
        else {
          setError(message);
          setErrorField(result.field ?? null);
        }
        return;
      }
      setProfile(result.data.profile);
      if (values.section === "disciplines") {
        setDivisionsDirty(false);
        setEditingDivisions(false);
        setDivisionsError(null);
        if (needsDisciplinesStep) {
          await reloadAfterStep();
        }
      } else {
        setProfileDirty(false);
        await reloadAfterStep();
      }
    } catch {
      if (divisionsSave) setDivisionsError(t.authErrorNetwork);
      else setError(t.authErrorNetwork);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleProfileSkip() {
    if (profileDirty) {
      setDiscardIntent({ type: "skip-profile" });
      return;
    }
    await executeProfileSkip();
  }

  async function executeProfileSkip() {
    setBannerError(null);
    setSkipping(true);
    try {
      const result = await dismissProfilePrompt();
      if (!result.ok) {
        setBannerError(translateAuthError(result.error, t));
        return;
      }
      setProfileDirty(false);
      await reloadAfterStep();
    } catch {
      setBannerError(t.authErrorNetwork);
    } finally {
      setSkipping(false);
    }
  }

  async function handleDisciplinesSkip() {
    if (divisionsDirty) {
      setDiscardIntent({ type: "skip-disciplines" });
      return;
    }
    await executeDisciplinesSkip();
  }

  async function executeDisciplinesSkip() {
    setBannerError(null);
    setSkipping(true);
    try {
      const result = await dismissDisciplinesPrompt();
      if (!result.ok) {
        setBannerError(translateAuthError(result.error, t));
        return;
      }
      setDivisionsDirty(false);
      await reloadAfterStep();
    } catch {
      setBannerError(t.authErrorNetwork);
    } finally {
      setSkipping(false);
    }
  }

  async function persistAccountEmail(email: string): Promise<boolean> {
    setEmailError(null);
    setSubmitting(true);
    try {
      const result = await setAccountEmail(email);
      if (!result.ok) {
        setEmailError(translateAuthError(result.error, t));
        return false;
      }
      await refresh();
      return true;
    } catch {
      setEmailError(t.authErrorNetwork);
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNotificationsSaved() {
    setNotificationsDirty(false);
    setEditingNotifications(false);
    setEmailError(null);
    if (!needsEmailStep) {
      return;
    }
    // SMS-only Save (no accounts.email) must stamp dismissal like Skip —
    // otherwise onboardingStep stays "email" across logout/password reset.
    if (!account.email?.trim()) {
      setBannerError(null);
      setSkipping(true);
      try {
        const result = await dismissEmailPrompt();
        if (!result.ok) {
          setBannerError(translateAuthError(result.error, t));
          return;
        }
      } catch {
        setBannerError(t.authErrorNetwork);
        return;
      } finally {
        setSkipping(false);
      }
    }
    await reloadAfterStep();
  }

  function requestCancelNotifications() {
    if (notificationsDirty) {
      setDiscardIntent({ type: "cancel-notifications" });
      return;
    }
    setEditingNotifications(false);
    setEmailError(null);
  }

  async function handleEmailSkip() {
    setBannerError(null);
    setSkipping(true);
    try {
      const result = await dismissEmailPrompt();
      if (!result.ok) {
        setBannerError(translateAuthError(result.error, t));
        return;
      }
      await reloadAfterStep();
    } catch {
      setBannerError(t.authErrorNetwork);
    } finally {
      setSkipping(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmation !== t.profileDeletePhrase || deletingRef.current) return;
    setDeleteError(null);
    deletingRef.current = true;
    setDeleting(true);
    try {
      const result = await deleteAccount();
      if (!result.ok) {
        setDeleteError(translateAuthError(result.error, t));
        return;
      }
      clearOtpProof("register");
      clearOtpProof("password_reset");
      setDeleteDialogOpen(false);
      setAccount(null);
      navigate("/", { replace: true });
    } catch {
      setDeleteError(t.authErrorNetwork);
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  }

  function openDeleteDialog() {
    setDeleteConfirmation("");
    setDeleteError(null);
    setDeleteDialogOpen(true);
  }

  function closeDeleteDialog() {
    if (deletingRef.current) return;
    setDeleteDialogOpen(false);
  }

  if (authLoading || !account) {
    return <AccountShell>{null}</AccountShell>;
  }

  const onboardingHint = onboardingStep ? (
    <HintPanel
      tone={bannerError ? "warning" : "info"}
      actionLabel={t.profileSkip}
      actionDisabled={skipping}
      onAction={() => {
        if (needsProfileStep) void handleProfileSkip();
        else if (needsDisciplinesStep) void handleDisciplinesSkip();
        else void handleEmailSkip();
      }}
    >
      {bannerError ??
        (needsProfileStep
          ? t.completeProfileIntro
          : needsDisciplinesStep
            ? t.disciplinesOnboardingHint
            : t.emailOnboardingHint)}
    </HintPanel>
  ) : undefined;

  return (
    <>
      <AccountShell
        hint={onboardingHint}
        activeAnchor={activeAnchor}
        onScrollToAnchor={scrollToAnchor}
        nickname={loadingProfile ? undefined : profile?.nickname?.trim() || null}
      >
        <ProfileContentSection id={PROFILE_ANCHOR}>
          {!loadingProfile && (
            <>
              <ProfileSectionHeader
                title={t.profileSummaryTitle}
                editing={showProfileEditor}
                editLabel={t.profileEdit}
                cancelLabel={t.profileEditCancel}
                busy={submitting}
                onEdit={() => {
                  setEditing(true);
                  setError(null);
                  setErrorField(null);
                }}
                onCancel={() => {
                  if (profileDirty) {
                    setDiscardIntent({ type: "cancel-profile" });
                    return;
                  }
                  setEditing(false);
                  setError(null);
                  setErrorField(null);
                }}
              />
              {showProfileEditor ? (
                <ProfileForm
                  mode="profile"
                  initialValues={profile ?? undefined}
                  submitting={submitting}
                  serverError={error}
                  serverField={errorField}
                  showMembershipHints={needsProfileStep}
                  onSubmit={handleProfileSubmit}
                  onDirtyChange={setProfileDirty}
                  onCancel={() => {
                    if (profileDirty) {
                      setDiscardIntent({ type: "cancel-profile" });
                      return;
                    }
                    setEditing(false);
                    setError(null);
                    setErrorField(null);
                  }}
                />
              ) : (
                <ProfileSummary
                  mode="profile"
                  profile={profile}
                  showMembershipHints={needsProfileStep}
                />
              )}
            </>
          )}
        </ProfileContentSection>

        <ProfileContentSection id={DIVISIONS_ANCHOR}>
          {!loadingProfile && (
            <>
              <ProfileSectionHeader
                title={t.profileMenuDivisions}
                editing={editingDivisions}
                editLabel={t.profileEdit}
                cancelLabel={t.profileEditCancel}
                busy={submitting}
                onEdit={() => {
                  setEditingDivisions(true);
                  setDivisionsError(null);
                }}
                onCancel={() => {
                  if (divisionsDirty) {
                    setDiscardIntent({ type: "cancel-divisions" });
                    return;
                  }
                  setEditingDivisions(false);
                  setDivisionsError(null);
                }}
              />
              {editingDivisions ? (
                <ProfileForm
                  mode="divisions"
                  initialValues={profile ?? undefined}
                  submitting={submitting}
                  serverError={divisionsError}
                  onSubmit={handleProfileSubmit}
                  onDirtyChange={setDivisionsDirty}
                  onCancel={() => {
                    if (divisionsDirty) {
                      setDiscardIntent({ type: "cancel-divisions" });
                      return;
                    }
                    setEditingDivisions(false);
                    setDivisionsError(null);
                  }}
                />
              ) : (
                <ProfileSummary mode="divisions" profile={profile} />
              )}
            </>
          )}
        </ProfileContentSection>

        {showNotifications && (
          <ProfileContentSection
            id={NOTIFICATIONS_ANCHOR}
            className="profile-page__notifications"
          >
            {!loadingProfile && (
              <>
                <ProfileSectionHeader
                  title={t.commChannelsTitle}
                  editing={editingNotifications}
                  editLabel={t.profileEdit}
                  cancelLabel={t.profileEditCancel}
                  busy={submitting}
                  onEdit={() => {
                    setEditingNotifications(true);
                    setEmailError(null);
                  }}
                  onCancel={requestCancelNotifications}
                />
                {editingNotifications ? (
                  <NotificationChannelsForm
                    initialEmail={account.email}
                    phoneE164={account.phoneE164}
                    submitting={submitting}
                    serverError={emailError}
                    onSaveEmail={persistAccountEmail}
                    onDirtyChange={setNotificationsDirty}
                    onCancel={requestCancelNotifications}
                    onSaved={handleNotificationsSaved}
                  />
                ) : (
                  <NotificationChannelsSummary
                    email={account.email}
                    phoneE164={account.phoneE164}
                  />
                )}
              </>
            )}
          </ProfileContentSection>
        )}
        <section
          id={ACTIONS_ANCHOR}
          className="profile-page__block profile-page__anchor profile-page__actions"
          aria-labelledby="profile-actions-heading"
        >
          <h2 id="profile-actions-heading" className="profile-page__section-title">
            {t.profileMenuActions}
          </h2>
          <Link className="btn btn--ghost" to="/change-phone">
            {t.profileChangePhone}
          </Link>
          <Link className="btn btn--ghost" to="/forgot-password">
            {t.profileChangePassword}
          </Link>
          <button
            className="btn profile-page__delete"
            type="button"
            ref={deleteTriggerRef}
            disabled={deleting}
            onClick={openDeleteDialog}
          >
            {t.profileDelete}
          </button>
        </section>
      </AccountShell>
      <AppDialog
        open={Boolean(discardIntent)}
        title={t.profileUnsavedTitle}
        description={t.profileUnsavedConfirm}
        onClose={closeUnsavedDialog}
        initialFocusRef={unsavedStayRef}
        actions={
          <>
            <button
              className="btn btn--ghost"
              type="button"
              onClick={confirmDiscardUnsaved}
            >
              {t.profileUnsavedLeave}
            </button>
            <button
              ref={unsavedStayRef}
              className="btn btn--primary"
              type="button"
              onClick={closeUnsavedDialog}
            >
              {t.profileUnsavedStay}
            </button>
          </>
        }
      />
      <AppDialog
        open={deleteDialogOpen}
        title={t.profileDeleteTitle}
        description={t.profileDeleteConfirm}
        tone="danger"
        busy={deleting}
        onClose={closeDeleteDialog}
        initialFocusRef={deleteInputRef}
        returnFocusRef={deleteTriggerRef}
        actions={
          <>
            <button
              className="btn btn--ghost"
              type="button"
              disabled={deleting}
              onClick={closeDeleteDialog}
            >
              {t.profileEditCancel}
            </button>
            <button
              className="btn btn--primary"
              type="button"
              disabled={deleting || deleteConfirmation !== t.profileDeletePhrase}
              onClick={handleDeleteAccount}
            >
              {deleting ? t.profileDeleting : t.profileDelete}
            </button>
          </>
        }
      >
        <label className="app-dialog__field">
          <span>{t.profileDeleteInputLabel}</span>
          <input
            ref={deleteInputRef}
            className="app-dialog__input"
            type="text"
            value={deleteConfirmation}
            autoComplete="off"
            spellCheck={false}
            disabled={deleting}
            onChange={(event) => setDeleteConfirmation(event.target.value)}
          />
        </label>
        {deleteError && (
          <p className="auth-page__error" role="alert">
            {deleteError}
          </p>
        )}
      </AppDialog>
    </>
  );
}
