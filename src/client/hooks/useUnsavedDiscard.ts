import { useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";

export type ProfileNavSection = "profile" | "matches" | "linked";

export type DiscardIntent =
  | { type: "route" }
  | { type: "skip-profile" }
  | { type: "skip-disciplines" }
  | { type: "nav"; next: ProfileNavSection }
  | { type: "cancel-profile" }
  | { type: "cancel-divisions" }
  | { type: "cancel-notifications" };

type UnsavedDiscardHandlers = {
  onSkipProfile: () => void;
  onSkipDisciplines: () => void;
  onNavigate: (next: ProfileNavSection) => void;
  onCancelProfile: () => void;
  onCancelDivisions: () => void;
  onCancelNotifications: () => void;
};

/**
 * Dirty-state + discard dialog for profile / divisions / notifications edit
 * sections, including React Router navigation blocking.
 */
export function useUnsavedDiscard(handlers: UnsavedDiscardHandlers) {
  const unsavedStayRef = useRef<HTMLButtonElement>(null);
  const [discardIntent, setDiscardIntent] = useState<DiscardIntent | null>(null);
  const [profileDirty, setProfileDirty] = useState(false);
  const [divisionsDirty, setDivisionsDirty] = useState(false);
  const [notificationsDirty, setNotificationsDirty] = useState(false);

  const dirty = profileDirty || divisionsDirty || notificationsDirty;
  const blocker = useBlocker(dirty);

  useEffect(() => {
    if (blocker.state === "blocked") {
      setDiscardIntent({ type: "route" });
      return;
    }
    setDiscardIntent((current) => (current?.type === "route" ? null : current));
  }, [blocker.state]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function clearAllDirty() {
    setProfileDirty(false);
    setDivisionsDirty(false);
    setNotificationsDirty(false);
  }

  function openPage(next: ProfileNavSection) {
    if (dirty) {
      setDiscardIntent({ type: "nav", next });
      return;
    }
    handlers.onNavigate(next);
  }

  function closeUnsavedDialog() {
    if (discardIntent?.type === "route" && blocker.state === "blocked") {
      blocker.reset();
    }
    setDiscardIntent(null);
  }

  function confirmDiscardUnsaved() {
    const intent = discardIntent;
    setDiscardIntent(null);
    if (!intent) return;

    switch (intent.type) {
      case "route":
        if (blocker.state === "blocked") blocker.proceed();
        break;
      case "skip-profile":
        void handlers.onSkipProfile();
        break;
      case "skip-disciplines":
        void handlers.onSkipDisciplines();
        break;
      case "nav":
        clearAllDirty();
        handlers.onNavigate(intent.next);
        break;
      case "cancel-profile":
        setProfileDirty(false);
        handlers.onCancelProfile();
        break;
      case "cancel-divisions":
        setDivisionsDirty(false);
        handlers.onCancelDivisions();
        break;
      case "cancel-notifications":
        setNotificationsDirty(false);
        handlers.onCancelNotifications();
        break;
    }
  }

  return {
    profileDirty,
    setProfileDirty,
    divisionsDirty,
    setDivisionsDirty,
    notificationsDirty,
    setNotificationsDirty,
    dirty,
    clearAllDirty,
    discardIntent,
    setDiscardIntent,
    unsavedStayRef,
    openPage,
    closeUnsavedDialog,
    confirmDiscardUnsaved,
  };
}
