import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PublicChrome } from "../components/PublicChrome";
import { HintPanel } from "../components/HintPanel";
import { PasswordField } from "../components/PasswordField";
import { useAuth } from "../auth";
import { useLocale } from "../locale";
import { login, safeNextPath } from "../lib/authApi";
import {
  AUTH_LOGIN_NOTICE_PARAM,
  parseAuthLoginNotice,
  type AuthLoginNotice,
} from "../lib/authNotice";
import { PROFILE_PATH } from "../lib/profileMenu";
import { translateAuthError } from "../lib/authErrors";

function loginNoticeMessage(notice: AuthLoginNotice, t: ReturnType<typeof useLocale>["t"]): string {
  return notice === "phone_changed" ? t.loginNoticePhoneChanged : t.loginNoticePasswordChanged;
}

export function LoginPage() {
  const { t } = useLocale();
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loginNotice, setLoginNotice] = useState<AuthLoginNotice | null>(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const parsed = parseAuthLoginNotice(searchParams.get(AUTH_LOGIN_NOTICE_PARAM));
    if (!parsed) {
      return;
    }
    setLoginNotice(parsed);
    const next = new URLSearchParams(searchParams);
    next.delete(AUTH_LOGIN_NOTICE_PARAM);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(phone, password);
      if (!result.ok) {
        setError(translateAuthError(result.error, t));
        return;
      }
      const onboardingStep = await refresh();
      if (onboardingStep) {
        navigate(PROFILE_PATH, { replace: true });
        return;
      }
      navigate(safeNextPath(searchParams.get("next")), { replace: true });
    } catch {
      setError(t.authErrorNetwork);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PublicChrome
        hint={
          loginNotice ? (
            <HintPanel>{loginNoticeMessage(loginNotice, t)}</HintPanel>
          ) : undefined
        }
      />
      <main className="auth-page">
        <h1 className="auth-page__title">{t.loginTitle}</h1>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-form__field">
            <span className="auth-form__label">{t.phoneLabel}</span>
            <input
              className="auth-form__input"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0XXXXXXXXX"
              required
            />
          </label>
          <PasswordField
            id="login-password"
            label={t.passwordLabel}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
          />
          {error && (
            <p className="auth-form__error" role="alert">
              {error}
            </p>
          )}
          <button className="btn btn--primary auth-form__submit" type="submit" disabled={submitting}>
            {submitting ? t.loginSubmitting : t.loginSubmit}
          </button>
        </form>
        <div className="auth-page__links">
          <Link to="/forgot-password" className="auth-page__link">
            {t.loginForgotLink}
          </Link>
          <p className="auth-page__hint">
            {t.loginRegisterPrompt}{" "}
            <Link to="/register" className="auth-page__link">
              {t.loginRegisterLink}
            </Link>
          </p>
        </div>
        <Link to="/" className="btn btn--ghost auth-page__back">
          {t.backHome}
        </Link>
      </main>
    </>
  );
}
