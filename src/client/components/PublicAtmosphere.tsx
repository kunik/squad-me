import type { ReactNode } from "react";

type PublicAtmosphereProps = {
  children: ReactNode;
};

/**
 * Shared atmospheric shell for all app routes.
 * Wash + hex sit as viewport-fixed siblings outside `.public-surface`
 * (PROFILE-005) so expanding profile panels cannot reflow the pattern, and
 * so `overflow: hidden` on the content shell cannot become their containing
 * block.
 */
export function PublicAtmosphere({ children }: PublicAtmosphereProps) {
  return (
    <>
      <div className="public-surface__wash" aria-hidden="true" />
      <div className="public-surface__grid" aria-hidden="true" />
      <div className="public-surface">
        <div className="public-surface__inner">{children}</div>
      </div>
    </>
  );
}
