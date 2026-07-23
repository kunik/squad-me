import type { ReactNode } from "react";

type SectionHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** Gentelella `.page-header` row: pretitle/description + title + actions. */
export function SectionHeader({
  title,
  description,
  actions,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`page-header${className ? ` ${className}` : ""}`}>
      <div className="page-header-row">
        <div>
          <h1 className="page-title">{title}</h1>
          {description ? <div className="page-pretitle page-description">{description}</div> : null}
        </div>
        {actions ? <div className="page-actions">{actions}</div> : null}
      </div>
    </div>
  );
}
