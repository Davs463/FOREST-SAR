import { BookOpen, CheckCircle2, Map as MapIcon, Radar, Satellite, Sun } from 'lucide-react';
import { Button } from '../../components';
import { routeHref } from '../../config/app.config';
import { useComparisons } from '../../services/comparisons';
import { useScience } from '../../services/ScienceProvider';
import { formatDate } from '../../shared/format';
import { ResearchExamples } from './ResearchExamples';
import { SarAnimation } from './SarAnimation';
import { sectionDomId } from './sectionNav';
import { Cite, SectionHead, useConservation } from './shared';

/** Real figures from the published snapshot. Comparisons share their final date: never summed. */
function SystemFigures() {
  const { c, num, locale } = useConservation();
  const tx = c.technology;
  const { state } = useScience();
  const { comparisons } = useComparisons();
  if (state.status === 'loading') return <p className="cons-muted" role="status">{tx.dataLoading}</p>;
  const catalog = state.status === 'ready' || state.status === 'catalog_only' ? state.catalog : null;
  if (!catalog) return <p className="cons-muted">{tx.dataMissing}</p>;
  const compatible = catalog.pairs.filter((p) => p.status === 'compatible').length;
  const rows = [...comparisons].sort((a, b) => (a.interval_days ?? 0) - (b.interval_days ?? 0));
  const max = Math.max(1, ...rows.map((r) => r.metrics.candidate_area_ha ?? 0));

  return (
    <div className="cons-system" data-testid="cons-system">
      <div className="cons-kpis cons-kpis--row">
        <p><strong>{num(catalog.scenes.length)}</strong><span>{tx.statScenes}</span></p>
        <p><strong>{num(compatible)}</strong><span>{tx.statPairs}</span></p>
        <p><strong>{num(comparisons.length)}</strong><span>{tx.statComparisons}</span></p>
      </div>
      {rows.length > 0 && (
        <div className="cons-periods">
          <p className="cons-periods__title">{tx.periodsTitle}</p>
          <ul>
            {rows.map((row) => {
              const ha = row.metrics.candidate_area_ha;
              return (
                <li key={row.snapshot_id} data-testid="cons-period-row">
                  <span className="cons-periods__label">{tx.periodRow.replace('{days}', String(row.interval_days ?? '—')).replace('{date}', formatDate(row.final_date, locale) ?? row.final_date)}</span>
                  <span className="cons-periods__track" aria-hidden="true"><span style={{ width: `${((ha ?? 0) / max) * 100}%` }} /></span>
                  <span className="cons-periods__value mono">{ha === null ? '—' : `${num(ha)} ha`}</span>
                </li>
              );
            })}
          </ul>
          <p className="cons-note">{tx.periodsNote}</p>
        </div>
      )}
    </div>
  );
}

export function SatelliteTechnology() {
  const { c } = useConservation();
  const tx = c.technology;
  return (
    <section className="cons-section cons-section--dark" id={sectionDomId('technology')} aria-labelledby="cons-tech-title" data-reveal>
      <SectionHead id="cons-tech-title" kicker={tx.kicker} title={tx.title} lede={tx.lede} />
      <Cite ids={['earthdataA']} />

      <div className="cons-sensors">
        <article><Sun size={22} aria-hidden="true" /><h3>{tx.passiveTitle}</h3><p>{tx.passive}</p><Cite ids={['earthdataA', 'jpl2017a', 'jpl2017c']} /></article>
        <article className="is-active"><Radar size={22} aria-hidden="true" /><h3>{tx.activeTitle}</h3><p>{tx.active}</p><Cite ids={['earthdataA', 'earthdataB']} /></article>
      </div>

      <h3 className="cons-subtitle">{tx.animTitle}</h3>
      <SarAnimation />

      <div className="cons-tech-grid">
        <article className="cons-tech-card">
          <h3>{tx.sarTitle}</h3>
          {tx.sar.map((p) => <p key={p}>{p}</p>)}
          <Cite ids={['earthdataB']} />
        </article>
        <article className="cons-tech-card">
          <h3><Satellite size={18} aria-hidden="true" />{tx.nisarTitle}</h3>
          <p>{tx.nisar}</p>
          <Cite ids={['jpl2017b', 'nasaC', 'earthdata2026']} />
          <h4>{tx.bandsTitle}</h4>
          <div className="cons-bands" aria-hidden="true">
            <svg viewBox="0 0 240 46"><path d={`M0 23 ${Array.from({ length: 6 }, (_, i) => `Q ${i * 40 + 10} ${i % 2 ? 41 : 5} ${i * 40 + 20} 23 T ${i * 40 + 40} 23`).join(' ')}`} fill="none" stroke="#a3d977" strokeWidth="2" /></svg>
            <svg viewBox="0 0 240 46"><path d={`M0 23 ${Array.from({ length: 15 }, (_, i) => `Q ${i * 16 + 4} ${i % 2 ? 37 : 9} ${i * 16 + 8} 23 T ${i * 16 + 16} 23`).join(' ')}`} fill="none" stroke="#7fc8f8" strokeWidth="2" /></svg>
          </div>
          <ul className="cons-bandlist">
            <li><span className="cons-dot" style={{ background: '#a3d977' }} />{tx.bandL}</li>
            <li><span className="cons-dot" style={{ background: '#7fc8f8' }} />{tx.bandS}</li>
          </ul>
          <Cite ids={['earthdataB']} />
        </article>
      </div>

      <div className="cons-plan" data-testid="cons-plan">
        <h3>{tx.planTitle}</h3>
        <div className="cons-plan__cols">
          <div>
            <h4>{tx.planMission}</h4>
            <ul>{tx.planMissionItems.map((i) => <li key={i}>{i}</li>)}</ul>
            <Cite ids={['jpl2017a', 'jpl2017b', 'earthdataB', 'nasaA']} />
          </div>
          <div className="cons-plan__ours">
            <h4><CheckCircle2 size={16} aria-hidden="true" />{tx.planOurs}</h4>
            <ul>{tx.planOursItems.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        </div>
      </div>

      <div className="cons-ours">
        <div>
          <h3>{tx.oursTitle}</h3>
          <p>{tx.ours}</p>
          <div className="cons-ours__cta">
            <Button variant="secondary" href={routeHref('observatory')} icon={<MapIcon size={16} aria-hidden="true" />} data-testid="cons-to-observatory">{tx.ctaObservatory}</Button>
            <Button variant="ghost" className="cons-btn--outline-light" href={routeHref('methodology')} icon={<BookOpen size={16} aria-hidden="true" />} data-testid="cons-to-methodology">{tx.ctaMethodology}</Button>
          </div>
        </div>
        <SystemFigures />
      </div>

      <ResearchExamples />
    </section>
  );
}
