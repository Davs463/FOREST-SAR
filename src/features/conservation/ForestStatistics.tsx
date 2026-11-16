import { useState } from 'react';
import { History } from 'lucide-react';
import { FOREST_TYPES, HONDURAS_FOREST, type ForestTypeId } from './conservation.data';
import { ForestTypesChart } from './ForestTypesChart';
import { sectionDomId } from './sectionNav';
import { Cite, Photo, SectionHead, useConservation } from './shared';

/** Canopy sketch for a density class: crowns seen from above. Illustrative only. */
function DensitySketch({ level }: { level: 0 | 1 | 2 }) {
  const crowns: [number, number, number][][] = [
    [[22, 24, 9], [74, 18, 8], [50, 58, 10], [96, 62, 8]],
    [[18, 22, 12], [52, 18, 13], [86, 26, 12], [30, 58, 13], [70, 60, 12], [104, 58, 9]],
    [[16, 18, 15], [44, 16, 15], [74, 18, 16], [102, 20, 14], [26, 48, 16], [58, 46, 16], [90, 50, 16], [14, 72, 12], [44, 74, 14], [76, 76, 13], [104, 74, 12]],
  ];
  return (
    <svg viewBox="0 0 120 90" className="cons-density__svg" aria-hidden="true">
      <rect width="120" height="90" rx="6" fill="#e9e3cf" />
      {crowns[level].map(([x, y, r]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#3d8a3f" fillOpacity=".85" stroke="#1f5a2a" strokeWidth="1" />)}
    </svg>
  );
}

export function ForestStatistics() {
  const { c, num } = useConservation();
  const [active, setActive] = useState<ForestTypeId | null>(null);
  const f = c.forests;

  return (
    <section className="cons-section" id={sectionDomId('forests')} aria-labelledby="cons-forests-title" data-reveal>
      <SectionHead id="cons-forests-title" kicker={f.kicker} title={f.title} lede={f.lede} />

      <div className="cons-stats">
        <div className="cons-stat cons-stat--hero" data-testid="cons-stat-total">
          <span className="cons-badge"><History size={13} aria-hidden="true" />{c.historical} · {HONDURAS_FOREST.year} · {c.notForestSar}</span>
          <strong className="cons-stat__value">{num(HONDURAS_FOREST.totalHa, 2)}</strong>
          <span className="cons-stat__label">{f.totalLabel}</span>
          <Cite ids={['icf2018']} />
        </div>
        <div className="cons-stat" data-testid="cons-stat-pct">
          <strong className="cons-stat__value">{HONDURAS_FOREST.territoryPct} %</strong>
          <span className="cons-stat__label">{f.pctLabel}</span>
          <div className="cons-meter" aria-hidden="true"><span style={{ width: `${HONDURAS_FOREST.territoryPct}%` }} /></div>
          <Cite ids={['icf2018']} />
        </div>
        <p className="cons-stat cons-stat--note">{f.global} <Cite ids={['ritchie2021']} /></p>
      </div>

      <ForestTypesChart onActive={setActive} />

      <ul className="cons-types" data-testid="forest-type-cards">
        {FOREST_TYPES.map((type) => {
          const tx = f.types[type.id];
          return (
            <li key={type.id} className={`cons-type${active === type.id ? ' is-active' : ''}`} style={{ ['--type-color' as string]: type.color }}>
              <Photo id={type.image} caption={tx.photo} representative />
              <div className="cons-type__body">
                <div className="cons-type__top">
                  <h3>{tx.name}</h3>
                  <span className="cons-type__pct mono">{num(type.pct, 1)} %</span>
                </div>
                <p className="cons-type__ha">{num(type.ha, 2)} ha</p>
                <p>{tx.text}</p>
                <Cite ids={['icf2018']} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="cons-concepts">
        <h3>{f.conceptsTitle}</h3>
        <p className="cons-muted">{f.conceptsLede} <Cite ids={['chazdon2016']} /></p>
        <ol className="cons-concepts__grid">
          {f.concepts.map((item, i) => (
            <li key={item.title}><span className="mono">{String.fromCharCode(65 + i)}</span><h4>{item.title}</h4><p>{item.text}</p></li>
          ))}
        </ol>
      </div>

      <div className="cons-density">
        <div>
          <h3>{f.densityTitle}</h3>
          <ul className="cons-density__grid">
            {f.density.map((d, i) => (
              <li key={d.name}><DensitySketch level={i as 0 | 1 | 2} /><h4>{d.name}</h4><p>{d.text}</p></li>
            ))}
          </ul>
          <p className="cons-note">{f.densityNote}</p>
        </div>
        <div className="cons-species">
          <h3>{f.speciesTitle}</h3>
          <ul>{f.species.map((s) => <li key={s}>{s}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}
