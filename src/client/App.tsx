import { Navigate, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import type { ReactNode } from "react";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ChangePhonePage } from "./pages/ChangePhonePage";
import { MatchesPage } from "./pages/MatchesPage";
import { LinkedShootersPage } from "./pages/LinkedShootersPage";
import { ProfilePage } from "./pages/ProfilePage";
import { LegalPage } from "./pages/LegalPage";
import { useAuth } from "./auth";
import { useLocale } from "./locale";
import { safeNextPath } from "./lib/authApi";
import { buildRequireAuthLoginRedirect } from "./lib/authNotice";
import { postAuthLandingPath, PROFILE_PATH } from "./lib/profileMenu";
import { SITE_FOOTER_PUBLIC_PATHS } from "./components/SiteFooter";

/**
 * Pages reachable while signed in with onboarding still pending: public
 * unauthenticated auth pages plus `/profile` (and legacy aliases that
 * redirect there). Matches, linked shooters, and home force `/profile`
 * until `onboardingStep` is null.
 */
const ONBOARDING_GUARD_EXEMPT_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/change-phone",
  "/profile",
  "/onboarding",
  "/complete-profile",
  ...SITE_FOOTER_PUBLIC_PATHS,
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
    return <Navigate to={PROFILE_PATH} replace />;
  }

  return <>{children}</>;
}

/** Guests only — signed-in visitors go to onboarding `/profile` or `?next=` / matches. */
function RequireGuest({ children }: { children: ReactNode }) {
  const { account, onboardingStep, loading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  if (loading) {
    return null;
  }
  if (account) {
    const to =
      onboardingStep !== null ? PROFILE_PATH : safeNextPath(searchParams.get("next"));
    // Never <Navigate> to the current path — RR remounts Navigate forever (AUTH-002).
    if (to === location.pathname) {
      return null;
    }
    return <Navigate to={to} replace />;
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
    return (
      <Navigate
        to={buildRequireAuthLoginRedirect(location.pathname, location.search)}
        replace
      />
    );
  }
  return <>{children}</>;
}

/** Public landing for guests; signed-in visitors go to matches (or `/profile` if onboarding). */
function HomeRoute() {
  const { account, onboardingStep, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }
  if (account) {
    const to = postAuthLandingPath(onboardingStep);
    // AUTH-002: <Navigate to={current path}> loops (max update depth). Landing
    // must never be `/` while this route is mounted.
    if (to === location.pathname) {
      return null;
    }
    return <Navigate to={to} replace />;
  }
  return <HomePage />;
}

/**
 * Unknown paths: guests → public `/`; signed-in users skip `/` and go straight
 * to matches/profile so catch-all ↔ HomeRoute cannot ping-pong (AUTH-002).
 */
function CatchAllRoute() {
  const { account, onboardingStep, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }
  if (account) {
    const to = postAuthLandingPath(onboardingStep);
    if (to === location.pathname) {
      return null;
    }
    return <Navigate to={to} replace />;
  }
  if (location.pathname === "/") {
    return null;
  }
  return <Navigate to="/" replace />;
}

export function App() {
  const { refreshError, refresh } = useAuth();
  const { t } = useLocale();

  return (
    <>
      {refreshError && (
        <div className="app-status" role="alert">
          <span>{t.authRefreshFailed}</span>
          <button type="button" className="link-btn" onClick={() => void refresh().catch(() => undefined)}>
            {t.retryButton}
          </button>
        </div>
      )}
      <OnboardingGuard>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
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
            element={<ForgotPasswordPage />}
          />
          <Route
            path="/change-phone"
            element={
              <RequireAuth>
                <ChangePhonePage />
              </RequireAuth>
            }
          />
          <Route
            path="/matches"
            element={
              <RequireAuth>
                <MatchesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/linked-shooters"
            element={
              <RequireAuth>
                <LinkedShootersPage />
              </RequireAuth>
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
          <Route path="/privacy" element={<LegalPage kind="privacy" />} />
          <Route path="/terms" element={<LegalPage kind="terms" />} />
          <Route path="/contact" element={<LegalPage kind="contact" />} />
          {/* Legacy aliases — profile owns post-auth onboarding + editing */}
          <Route path="/onboarding" element={<Navigate to={PROFILE_PATH} replace />} />
          <Route path="/complete-profile" element={<Navigate to={PROFILE_PATH} replace />} />
          <Route path="*" element={<CatchAllRoute />} />
        </Routes>
      </OnboardingGuard>
    </>
  );
}
