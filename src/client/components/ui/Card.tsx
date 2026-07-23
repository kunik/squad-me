import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

/** Gentelella `.card` surface. Domain modifiers belong on callers (e.g. MatchCard). */
export function Card({ children, className = "" }: CardProps) {
  return <div className={`card${className ? ` ${className}` : ""}`}>{children}</div>;
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
        <h2 className="card-title">{title}</h2>
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
