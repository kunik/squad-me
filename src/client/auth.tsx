import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchMe, type AccountView, type OnboardingStep } from "./lib/authApi";

type AuthContextValue = {
  account: AccountView | null;
  /** Next unfinished post-auth step from `/me`, or `null` when onboarding is done. */
  onboardingStep: OnboardingStep | null;
  loading: boolean;
  refreshError: string | null;
  refresh: () => Promise<OnboardingStep | null>;
  setAccount: (account: AccountView | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccountState] = useState<AccountView | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const current = await fetchMe();
    if (!current.ok) {
      if (current.status === 401) {
        setAccountState(null);
        setOnboardingStep(null);
        setRefreshError(null);
        return null;
      }
      setRefreshError(current.error);
      throw new Error(current.error);
    }
    setRefreshError(null);
    setAccountState(current.data.account);
    const step = current.data.onboardingStep;
    setOnboardingStep(step);
    return step;
  }, []);

  useEffect(() => {
    refresh()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [refresh]);

  // Exposed for logout: callers clear the account optimistically before
  // `refresh()` confirms it. Clearing the account always clears onboarding too.
  const setAccount = useCallback((next: AccountView | null) => {
    setAccountState(next);
    if (!next) {
      setOnboardingStep(null);
    }
  }, []);

  const value = useMemo(
    () => ({ account, onboardingStep, loading, refreshError, refresh, setAccount }),
    [account, onboardingStep, loading, refreshError, refresh, setAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
