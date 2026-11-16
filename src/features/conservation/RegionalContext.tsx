import { Flame, MapPin, Trees } from 'lucide-react';
import { useComparisons } from '../../services/comparisons';
import { MORAZAN } from './conservation.data';
import { Cite, useConservation } from './shared';

/** Departmental and municipal context. Each figure keeps its territory and year; nothing is summed across scales. */
export function RegionalContext() {
  const { c, num } = useConservation();
  const r = c.region;
  const { comparisons } = useComparisons();
  const valid = comparisons.map((x) => x.metrics.valid_area_ha).filter((v): v is number => typeof v === 'number');
  const lo = valid.length ? Math.min(...valid) : null;
  const hi = valid.length ? Math.max(...valid) : null;
  const windowArea = lo === null || hi === null ? null : lo === hi ? num(lo) : `${num(lo)}–${num(hi)}`;
  const pineShare = `${num((MORAZAN.pineHa / MORAZAN.forestHa) * 100, 0)} %`;
  const scales = ['honduras', 'morazan', 'dc', 'tigra', 'window'] as const;

  return (
    <section className="cons-region" aria-labelledby="cons-region-title" data-testid="cons-region">
      <header className="cons-head cons-head--sub">
        <span className="mono cons-kicker">{r.kicker}</span>
        <h3 id="cons-region-title">{r.title}</h3>
        <p className="cons-lede">{r.lede}</p>
      </header>

      <ol className="cons-scales" aria-label={r.scaleTitle}>
        {scales.map((s, i) => (
          <li key={s} className={`cons-scale cons-scale--${s}`}>
            <span className="mono">{String(i + 1).padStart(2, '0')}</span>
            <strong>{r.scales[s].name}</strong>
            <span>{r.scales[s].note}</span>
          </li>
        ))}
      </ol>

      <div className="cons-region__grid">
        <article className="cons-panel">
          <h4><Trees size={18} aria-hidden="true" />{r.scales.morazan.name}</h4>
          <div className="cons-kpis">
            <p><strong>{num(MORAZAN.forestHa)}</strong><span>{r.morazanForest}</span></p>
            <p><strong>{MORAZAN.territoryPct} %</strong><span>{r.morazanPct}</span></p>
            <p><strong>{num(MORAZAN.pineHa)}</strong><span>{r.morazanPine}</span></p>
          </div>
          <div className="cons-meter cons-meter--pine" aria-hidden="true"><span style={{ width: `${(MORAZAN.pineHa / MORAZAN.forestHa) * 100}%` }} /></div>
          <p className="cons-muted">{r.pineShare.replace('{pct}', pineShare)}</p>
          <Cite ids={['icfnd']} />
        </article>
        <article className="cons-panel cons-panel--fire">
          <h4><Flame size={18} aria-hidden="true" />{r.scales.morazan.name} · 2024</h4>
          <div className="cons-kpis">
            <p><strong>{num(MORAZAN.fires2024)}</strong><span>{r.fires}</span></p>
            <p><strong>{num(MORAZAN.burned2024Ha)}</strong><span>{r.burned}</span></p>
          </div>
          <Cite ids={['icfnd']} />
          <p className="cons-panel__sub"><MapPin size={14} aria-hidden="true" /><span><strong>{r.scales.dc.name} · 2026.</strong> {r.dcFires}</span></p>
          <Cite ids={['bustillo2026']} />
        </article>
        <article className="cons-panel cons-panel--window" data-testid="cons-window">
          <h4>{r.scales.window.name}</h4>
          <div className="cons-kpis">
            <p><strong>{windowArea ?? '—'}</strong><span>{r.windowArea}</span></p>
          </div>
          <p className="cons-muted">{r.windowNote}</p>
        </article>
      </div>

      <div className="cons-why">
        <h4>{r.whyTitle}</h4>
        <ul>{r.why.map((w) => <li key={w}>{w}</li>)}</ul>
      </div>
    </section>
  );
}
