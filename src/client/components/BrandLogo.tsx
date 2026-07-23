import { BrandWordmark } from "./BrandWordmark";

/** Mark for dark surfaces (Floral White + Pumpkin). */
export const LOGO_MARK_LIGHT = "/logo-mark-light.svg";
/** Mark for light surfaces (Black + Pumpkin). */
export const LOGO_MARK_DARK = "/logo-mark-dark.svg";

type BrandMarkProps = {
  /** Mark size in CSS pixels. */
  size?: number;
  /**
   * Surface behind the mark.
   * - `dark` → light mark (sidebar)
   * - `light` → dark mark
   * - `theme` → follows `html[data-theme]`
   */
  on?: "dark" | "light" | "theme";
  className?: string;
};

/** Squad Me mark (SVG) with light/dark variants. */
export function BrandMark({ size = 28, on = "theme", className = "brand-icon" }: BrandMarkProps) {
  if (on === "dark") {
    return (
      <span className={className}>
        <img src={LOGO_MARK_LIGHT} alt="" width={size} height={size} />
      </span>
    );
  }
  if (on === "light") {
    return (
      <span className={className}>
        <img src={LOGO_MARK_DARK} alt="" width={size} height={size} />
      </span>
    );
  }
  return (
    <span className={`${className} brand-icon--themed`}>
      <img
        className="brand-mark brand-mark--for-dark"
        src={LOGO_MARK_LIGHT}
        alt=""
        width={size}
        height={size}
      />
      <img
        className="brand-mark brand-mark--for-light"
        src={LOGO_MARK_DARK}
        alt=""
        width={size}
        height={size}
      />
    </span>
  );
}

type BrandFullLogoProps = {
  className?: string;
  /** Mark size in CSS pixels. */
  markSize?: number;
  /** Surface behind the lockup; defaults to theme. */
  on?: "dark" | "light" | "theme";
  /** Optional class on the text wordmark. */
  nameClassName?: string;
};

/** Full logo as mark + text wordmark (`squadme`). */
export function BrandFullLogo({
  className = "brand-lockup",
  markSize = 56,
  on = "theme",
  nameClassName = "brand-name brand-lockup-name",
}: BrandFullLogoProps) {
  return (
    <span className={className} role="img" aria-label="Squad Me">
      <BrandMark size={markSize} on={on} className="brand-icon brand-lockup-mark" />
      <BrandWordmark className={nameClassName} />
    </span>
  );
}
