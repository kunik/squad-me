import { Link } from "react-router-dom";
import { LangSwitch } from "./LangSwitch";
import { ThemeSwitch } from "./ThemeSwitch";

type GuestBrandProps = {
  /** Extra class on the brand link (e.g. `auth-brand`). */
  className?: string;
  /** Mark size in px (auth card uses 34, home topbar 26). */
  markSize?: number;
  /** Optional name class override (e.g. `home-brand-name`). */
  nameClassName?: string;
};

/** Shared Squad Me mark + name link for guest surfaces. */
export function GuestBrand({
  className = "brand",
  markSize = 26,
  nameClassName = "brand-name",
}: GuestBrandProps) {
  return (
    <Link to="/" className={className} aria-label="Squad Me">
      <span className="brand-icon">
        <img src="/logo-mark.svg" alt="" width={markSize} height={markSize} />
      </span>
      <span className={nameClassName}>Squad Me</span>
    </Link>
  );
}

type GuestUtilitiesProps = {
  className?: string;
  /** Compact theme toggle (auth/home). */
  compactTheme?: boolean;
};

/** Shared language + theme controls for guest surfaces. */
export function GuestUtilities({ className, compactTheme = true }: GuestUtilitiesProps) {
  return (
    <div className={className}>
      <LangSwitch />
      <ThemeSwitch compact={compactTheme} />
    </div>
  );
}
