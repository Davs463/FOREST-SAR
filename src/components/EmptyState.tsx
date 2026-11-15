import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  message?: string;
  tone?: 'neutral' | 'error';
  action?: ReactNode;
  children?: ReactNode;
}

export function EmptyState({ title, message, tone = 'neutral', action, children }: EmptyStateProps) {
  return (
    <div className={`empty-state empty-state--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      <h3 className="empty-state__title">{title}</h3>
      {message && <p className="empty-state__message">{message}</p>}
      {children}
      {action && <div className="empty-state__action">{action}</div>}
    </div>
  );
}
