import type { ReactNode } from "react";

export type BadgeTone = "accent" | "info" | "neutral" | "success" | "warning" | "danger";

type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
};

/** Compact status/role chip on Gentelella's `.badge` pill. */
export function Badge({ children, tone = "neutral", className = "" }: BadgeProps) {
  return (
    <span className={`badge badge-${tone}${className ? ` ${className}` : ""}`}>{children}</span>
  );
}
