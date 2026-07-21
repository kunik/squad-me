import { Navigate, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import type { ReactNode } from "react";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ProfilePage } from "./pages/ProfilePage";
import { PublicAtmosphere } from "./components/PublicAtmosphere";
import { useAuth } from "./auth";
import { useLocale } from "./locale";
import { safeNextPath } from "./lib/authApi";

/**
 * Pages reachable while signed in with onboarding still pending: public
 * unauthenticated auth pages plus `/profile` (and legacy aliases that
 * redirect there). Home and everything else force a redirect until
 * `onboardingStep` is null — refresh always converges on `/profile`.
 */
const ONBOARDING_GUARD_EXEMPT_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/profile",
  "/onboarding",
  "/complete-profile",
]);

/**
 * Resilience guard: if a session exists and `onboardingStep` is non-null
 * (profile and/or email still unfinished — e.g. the browser closed after
 * register), force `/profile` for any other non-exempt route. Driven by
 * `GET /api/auth/me` (DB state), so it survives a fresh page load.
 */
function OnboardingGuard({ children }: { children: ReactNode }) {
  const { account, onboardingStep, loading } = useAuth();
  const location = useLocation();

  if (
    !loading &&
    account &&
    onboardingStep !== null &&
    !ONBOARDING_GUARD_EXEMPT_PATHS.has(location.pathname)
  ) {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}

/** Guests only — signed-in visitors go to onboarding `/profile` or `?next=` / home. */
function RequireGuest({ children }: { children: ReactNode }) {
  const { account, onboardingStep, loading } = useAuth();
  const [searchParams] = useSearchParams();

  if (loading) {
    return null;
  }
  if (account) {
    if (onboardingStep !== null) {
      return <Navigate to="/profile" replace />;
    }
    return <Navigate to={safeNextPath(searchParams.get("next"))} replace />;
  }
  return <>{children}</>;
}

/** Signed-in only — guests are sent to login with a safe `?next=` return path. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { account, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }
  if (!account) {
    const next = `${location.pathname}${location.search}`;
    const qs = next && next !== "/" ? `?next=${encodeURIComponent(next)}` : "";
    return <Navigate to={`/login${qs}`} replace />;
  }
  return <>{children}</>;
}

export function App() {
  const { refreshError, refresh } = useAuth();
  const { t } = useLocale();

  return (
    <PublicAtmosphere>
      {refreshError && (
        <div className="app-status" role="alert">
          <span>{t.authRefreshFailed}</span>
          <button type="button" className="auth-page__link auth-page__link--button" onClick={() => void refresh().catch(() => undefined)}>
            {t.retryButton}
          </button>
        </div>
      )}
      <OnboardingGuard>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/login"
            element={
              <RequireGuest>
                <LoginPage />
              </RequireGuest>
            }
          />
          <Route
            path="/register"
            element={
              <RequireGuest>
                <RegisterPage />
              </RequireGuest>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <RequireGuest>
                <ForgotPasswordPage />
              </RequireGuest>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          {/* Legacy aliases — profile owns post-auth onboarding + editing */}
          <Route path="/onboarding" element={<Navigate to="/profile" replace />} />
          <Route path="/complete-profile" element={<Navigate to="/profile" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </OnboardingGuard>
    </PublicAtmosphere>
  );
}
