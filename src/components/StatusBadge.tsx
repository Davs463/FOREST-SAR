import type { CSSProperties, ReactNode } from 'react';

export type BadgeTone = 'neutral' | 'info' | 'ok' | 'warn' | 'danger' | 'demo' | 'none';

interface StatusBadgeProps {
  tone?: BadgeTone;
  /** Optional CSS colour var for semantic scales (e.g. the cover-loss traffic light). */
  colorVar?: string;
  children: ReactNode;
}

// Always text + dot: meaning never relies on colour alone.
export function StatusBadge({ tone = 'neutral', colorVar, children }: StatusBadgeProps) {
  const style = colorVar ? ({ '--badge-color': `var(${colorVar})` } as CSSProperties) : undefined;
  return <span className={`status-badge status-badge--${tone}`} style={style}><i aria-hidden="true" />{children}</span>;
}
