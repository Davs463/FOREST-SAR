import { useEffect, useState } from 'react';
import { FOREST_TYPES, type ForestTypeId } from './conservation.data';
import { Cite, useConservation } from './shared';

/** Part-of-whole for four categories: ranked horizontal bars with direct labels (no legend needed) and a table view. */
export function ForestTypesChart({ onActive }: { onActive: (id: ForestTypeId | null) => void }) {
  const { c, num } = useConservation();
  const [table, setTable] = useState(false);
  // Hover previews a bar; click/Enter pins it. The shown bar is the hovered one, else the pinned one.
  const [hovered, setHovered] = useState<ForestTypeId | null>(null);
  const [pinned, setPinned] = useState<ForestTypeId | null>(null);
  const active = hovered ?? pinned;
  useEffect(() => { onActive(active); }, [active, onActive]);
  const max = Math.max(...FOREST_TYPES.map((f) => f.pct));
  const focus = FOREST_TYPES.find((f) => f.id === active) ?? FOREST_TYPES[0];

  return (
    <figure className="cons-chart" data-testid="forest-types-chart">
      <figcaption className="cons-chart__head">
        <span className="cons-chart__title">{c.forests.chartTitle}</span>
        <span className="cons-chart__hint">{c.forests.chartHint}</span>
      </figcaption>
      <ul className="cons-bars" onMouseLeave={() => setHovered(null)}>
        {FOREST_TYPES.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              className={`cons-bar${active === f.id ? ' is-active' : ''}${active && active !== f.id ? ' is-dim' : ''}`}
              aria-pressed={pinned === f.id}
              aria-label={`${c.forests.types[f.id].name}: ${num(f.pct, 1)} %, ${num(f.ha, 2)} ha`}
              onMouseEnter={() => setHovered(f.id)}
              onFocus={() => setHovered(f.id)}
              onBlur={() => setHovered(null)}
              onClick={() => { setHovered(null); setPinned((p) => (p === f.id ? null : f.id)); }}
              data-testid={`forest-bar-${f.id}`}
            >
              <span className="cons-bar__label">{c.forests.types[f.id].name}</span>
              <span className="cons-bar__track" aria-hidden="true">
                <span className="cons-bar__fill" style={{ width: `${(f.pct / max) * 100}%`, background: f.color }} />
              </span>
              <span className="cons-bar__value mono">{num(f.pct, 1)} %</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="cons-chart__readout" aria-live="polite" data-testid="forest-readout">
        <span className="cons-chart__swatch" style={{ background: focus.color }} aria-hidden="true" />
        <strong>{c.forests.types[focus.id].name}</strong>
        <span>{num(focus.ha, 2)} ha · {num(focus.pct, 1)} %</span>
      </div>
      <div className="cons-chart__foot">
        <Cite ids={['icf2018']} />
        <button type="button" className="cons-linkbtn" aria-expanded={table} onClick={() => setTable((v) => !v)}>{table ? c.forests.chartHide : c.forests.chartTable}</button>
      </div>
      {table && (
        <div className="cons-table-wrap">
          <table className="cons-table" data-testid="forest-table">
            <caption className="visually-hidden">{c.forests.chartTitle}</caption>
            <thead><tr><th scope="col">{c.forests.colType}</th><th scope="col">{c.forests.colPct}</th><th scope="col">{c.forests.colHa}</th></tr></thead>
            <tbody>
              {FOREST_TYPES.map((f) => (
                <tr key={f.id}><th scope="row">{c.forests.types[f.id].name}</th><td>{num(f.pct, 1)} %</td><td>{num(f.ha, 2)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
