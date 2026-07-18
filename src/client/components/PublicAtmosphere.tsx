import type { ReactNode } from "react";

type PublicAtmosphereProps = {
  children: ReactNode;
};

/** Shared atmospheric shell for unauthenticated / public surfaces. */
export function PublicAtmosphere({ children }: PublicAtmosphereProps) {
  return (
    <div className="public-surface">
      <div className="public-surface__grid" aria-hidden="true" />
      <div className="public-surface__inner">{children}</div>
    </div>
  );
}
