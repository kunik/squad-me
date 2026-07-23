import type { ReactNode } from "react";
import { GuestBrand } from "./GuestChrome";

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
 * centered `.auth-card`. Brand mark on top. Language/theme stay on Home only —
 * single-form auth flows should not compete with the form.
 * Footer exit: pages should render `AuthExitLink` (signed-in → profile, guest → home).
 */
export function AuthLayout({ hint, title, subtitle, wide = false, children }: AuthLayoutProps) {
  return (
    <main className="auth-page">
      <div className={`auth-card${wide ? " is-wide" : ""}`}>
        <GuestBrand className="auth-brand" markSize={34} />

        {title ? <h1 className="auth-title">{title}</h1> : null}
        {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}
        {hint}

        {children}
      </div>
    </main>
  );
}
