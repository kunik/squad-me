import type { ReactNode } from "react";

export type BadgeTone = "accent" | "info" | "neutral" | "success" | "warning" | "danger";

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
};

/** Compact status/role chip. Tones map to `.badge-{tone}`; nav `.badge-red/teal/blue`
 * are CSS aliases of the same danger/accent/info tokens. */
export function Badge({ children, tone = "neutral", className = "" }: BadgeProps) {
  return (
    <span className={`badge badge-${tone}${className ? ` ${className}` : ""}`}>{children}</span>
  );
}
