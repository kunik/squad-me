import type { ReactNode } from "react";

type EmptyStateProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

/** Gentelella `.empty-state`. */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 4v5M16 4v5" />
        </svg>
      </div>
      <p className="empty-state-title">{title}</p>
      {description ? <p className="empty-state-text">{description}</p> : null}
      {action ? <div className="empty-state-actions">{action}</div> : null}
    </div>
  );
}
