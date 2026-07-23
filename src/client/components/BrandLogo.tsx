/** Mark for dark surfaces (Floral White + Pumpkin). */
export const LOGO_MARK_LIGHT = "/logo-mark-light.png";
/** Mark for light surfaces (Black + Pumpkin). */
export const LOGO_MARK_DARK = "/logo-mark-dark.png";

/** Full wordmark for dark surfaces. */
export const LOGO_FULL_LIGHT = "/logo-full-light.png";
/** Full wordmark for light surfaces. */
export const LOGO_FULL_DARK = "/logo-full-dark.png";

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

/** Squad Me mark with light/dark assets. */
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
  width?: number;
  height?: number;
  /** Surface behind the logo; defaults to theme. */
  on?: "dark" | "light" | "theme";
};

/** Full logo (mark + wordmark) with light/dark assets. */
export function BrandFullLogo({
  className = "hero-logo",
  width = 788,
  height = 177,
  on = "theme",
}: BrandFullLogoProps) {
  if (on === "dark") {
    return (
      <img
        className={className}
        src={LOGO_FULL_LIGHT}
        alt="Squad Me"
        width={width}
        height={height}
      />
    );
  }
  if (on === "light") {
    return (
      <img
        className={className}
        src={LOGO_FULL_DARK}
        alt="Squad Me"
        width={width}
        height={height}
      />
    );
  }
  return (
    <span className={`brand-full--themed ${className}`} role="img" aria-label="Squad Me">
      <img
        className="brand-full brand-full--for-dark"
        src={LOGO_FULL_LIGHT}
        alt=""
        width={width}
        height={height}
      />
      <img
        className="brand-full brand-full--for-light"
        src={LOGO_FULL_DARK}
        alt=""
        width={width}
        height={height}
      />
    </span>
  );
}
