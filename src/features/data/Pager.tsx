import { Button } from '../../components';
import { useI18n } from '../../i18n';
import { formatCount } from '../../shared/format';

export const PAGE_SIZE = 20;

export function Pager({ page, total, onPage }: { page: number; total: number; onPage: (page: number) => void }) {
  const { t, locale } = useI18n();
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total <= PAGE_SIZE) return null;
  return (
    <nav className="data__pager" aria-label={t('data.pagination')}>
      <Button variant="ghost" className="btn--sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>{t('data.prev')}</Button>
      <span role="status">{t('data.pageOf', { page: formatCount(page, locale), pages: formatCount(pages, locale) })}</span>
      <Button variant="ghost" className="btn--sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>{t('data.next')}</Button>
    </nav>
  );
}

export function slicePage<T>(rows: T[], page: number): T[] {
  return rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
}
