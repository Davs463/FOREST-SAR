import { useMemo, useState } from 'react';
import { Button, EmptyState, Tabs, panelDomId, tabDomId, type TabItem } from '../../components';
import { routeHref } from '../../config/app.config';
import { useI18n } from '../../i18n';
import { useComparisons } from '../../services/comparisons';
import { useScience } from '../../services/ScienceProvider';
import { describeError } from '../../shared/errors';
import { formatCount } from '../../shared/format';
import { ComparisonsTable } from './ComparisonsTable';
import { PairList } from './PairList';
import { ScenesTable } from './ScenesTable';
import { buildPairRows, splitPairs } from './pairs';
import './data.css';

type TabId = 'catalog' | 'comparisons' | 'pending' | 'incompatible';

export function DataExplorer() {
  const { t, locale } = useI18n();
  const { state, reload } = useScience();
  const set = useComparisons();
  const [tab, setTab] = useState<TabId>('catalog');
  const catalog = state.status === 'ready' || state.status === 'catalog_only' ? state.catalog : null;
  const rows = useMemo(() => (catalog ? buildPairRows(catalog) : []), [catalog]);
  const { pending, incompatible } = useMemo(() => splitPairs(rows, set.comparisons), [rows, set.comparisons]);

  const head = (
    <div className="page__head data__head">
      <div>
        <p className="eyebrow"><span className="eyebrow-line" /> {t('data.eyebrow')}</p>
        <h1 id="data-title">{t('data.title')}</h1>
        <p>{t('data.lede')}</p>
      </div>
      <Button variant="secondary" className="btn--sm" href={routeHref('observatory')}>{t('data.backToObservatory')}</Button>
    </div>
  );

  let body;
  if (state.status === 'loading') body = <EmptyState title={t('common.loading')} />;
  else if (state.status === 'error') {
    body = <EmptyState tone="error" title={t('observatory.errorTitle')} message={describeError(t, state.error)} action={<Button variant="secondary" onClick={reload}>{t('common.retry')}</Button>} />;
  } else if (!catalog) {
    body = <EmptyState title={t('observatory.noDataTitle')} message={t('observatory.noDataBody')} action={<Button variant="secondary" onClick={reload}>{t('observatory.retryLoad')}</Button>} />;
  } else {
    const count = (n: number) => ` (${formatCount(n, locale)})`;
    const tabs: TabItem[] = [
      { id: 'catalog', label: t('data.tabCatalog') + count(catalog.scenes.length) },
      { id: 'comparisons', label: t('data.tabComparisons') + count(set.comparisons.length) },
      { id: 'pending', label: t('data.tabPending') + count(pending.length) },
      { id: 'incompatible', label: t('data.tabIncompatible') + count(incompatible.length) },
    ];
    body = (
      <>
        <Tabs idPrefix="data-tab" tabs={tabs} activeId={tab} onChange={(id) => setTab(id as TabId)} label={t('data.tabsLabel')} />
        <div id={panelDomId('data-tab')} role="tabpanel" aria-labelledby={tabDomId('data-tab', tab)} className="data__panel">
          {tab === 'catalog' && <ScenesTable scenes={catalog.scenes} />}
          {tab === 'comparisons' && <ComparisonsTable set={set} />}
          {tab === 'pending' && <PairList key="pending" rows={pending} kind="pending" />}
          {tab === 'incompatible' && <PairList key="incompatible" rows={incompatible} kind="incompatible" />}
        </div>
      </>
    );
  }

  return <section className="page data" aria-labelledby="data-title">{head}{body}</section>;
}

export default DataExplorer;
