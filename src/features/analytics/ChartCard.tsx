import type { ReactNode } from 'react';
import { useI18n } from '../../i18n';
import { SOURCE_LABEL } from './analytics.config';

export interface TableData { head: string[]; rows: (string | number)[][] }

interface ChartCardProps {
  testId: string;
  id: string;
  title: string;
  explain: string;
  /** Alternative accessible table of the plotted values. */
  table?: TableData | null;
  children: ReactNode;
}

/** Frame shared by every chart: heading, plain explanation, source line and a table alternative. */
export function ChartCard({ testId, id, title, explain, table, children }: ChartCardProps) {
  const { t } = useI18n();
  return (
    <section className="an-card" data-testid={testId} aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="an-card__title">{title}</h3>
      <p className="an-card__explain">{explain}</p>
      {children}
      <p className="an-card__source">{t('analytics.sourceLabel')}: {SOURCE_LABEL}</p>
      {table && table.rows.length > 0 && (
        <details className="an-card__table">
          <summary>{t('analytics.viewTable')}</summary>
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">{title}</caption>
              <thead><tr>{table.head.map((h) => <th scope="col" key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {table.rows.map((row, i) => (
                  <tr key={i}>{row.map((cell, j) => (j === 0 ? <th scope="row" key={j}>{cell}</th> : <td key={j}>{cell}</td>))}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}

export function ChartNote({ children, tone }: { children: ReactNode; tone?: 'warn' }) {
  return <p className={`an-note${tone ? ` an-note--${tone}` : ''}`} role="status">{children}</p>;
}
