import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  featured?: boolean;
  muted?: boolean;
};

/** Gentelella `.card` surface. */
export function Card({ children, className = "", featured = false, muted = false }: CardProps) {
  const mods = [
    featured ? "match-card is-featured" : "",
    muted ? "match-card is-past" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <div className={`card ${mods}`.trim()}>{children}</div>;
}

type CardHeaderProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
};

export function CardHeader({ title, subtitle, actions }: CardHeaderProps) {
  return (
    <div className="card-header">
      <div>
        <div className="card-title">{title}</div>
        {subtitle ? <div className="card-subtitle">{subtitle}</div> : null}
      </div>
      {actions ? <div className="card-options">{actions}</div> : null}
    </div>
  );
}

export function CardBody({
  children,
  className = "",
  flush = false,
}: {
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <div className={`card-body${flush ? " p-0" : ""}${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}
