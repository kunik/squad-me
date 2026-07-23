import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
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
    <AuthLayout
      title={t.loginTitle}
      hint={
        loginNotice ? <HintPanel>{loginNoticeMessage(loginNotice, t)}</HintPanel> : undefined
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="login-phone">
            {t.phoneLabel}
          </label>
          <input
            id="login-phone"
            className="form-control"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0XXXXXXXXX"
            required
          />
        </div>
        <PasswordField
          id="login-password"
          label={t.passwordLabel}
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />
        {error && (
          <div className="form-error form-error--banner" role="alert">
            {error}
          </div>
        )}
        <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={submitting}>
          {submitting ? t.loginSubmitting : t.loginSubmit}
        </button>
      </form>
      <div className="auth-links">
        <Link to="/forgot-password">{t.loginForgotLink}</Link>
        <p>
          {t.loginRegisterPrompt} <Link to="/register">{t.loginRegisterLink}</Link>
        </p>
        <Link to="/">{t.backHome}</Link>
      </div>
    </AuthLayout>
  );
}
