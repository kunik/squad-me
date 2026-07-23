import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LangSwitch } from "./LangSwitch";
import { ThemeSwitch } from "./ThemeSwitch";

type AuthLayoutProps = {
  hint?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  /** Wider card for the register → profile step. */
  wide?: boolean;
  children: ReactNode;
};

/**
 * Guest/auth chrome: Gentelella's full-viewport `.auth-page` background with a
 * centered `.auth-card`. Brand mark on top, language switch at the foot.
 */
export function AuthLayout({ hint, title, subtitle, wide = false, children }: AuthLayoutProps) {
  return (
    <main className="auth-page">
      <div className={`auth-card${wide ? " is-wide" : ""}`}>
        <Link to="/" className="auth-brand" aria-label="Squad Me">
          <span className="brand-icon">
            <img src="/logo-mark.svg" alt="" width={34} height={34} />
          </span>
          <span className="brand-name">Squad Me</span>
        </Link>

        {title ? <h1 className="auth-title">{title}</h1> : null}
        {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}
        {hint}

        {children}

        <div className="auth-utilities">
          <LangSwitch />
          <ThemeSwitch compact />
        </div>
      </div>
    </main>
  );
}
