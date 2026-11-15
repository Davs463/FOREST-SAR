import { useState } from 'react';

export interface BarItem {
  key: string;
  label: string;
  /** null = no data for this bar (drawn as a hatched gap, never as zero). */
  value: number | null;
  valueText: string;
  color?: string;
  /** Tooltip lines (date, unit, ...). */
  tip: string[];
  highlight?: boolean;
}

interface BarChartProps {
  items: BarItem[];
  ariaLabel: string;
  orientation?: 'v' | 'h';
  noDataText: string;
}

const W = 560;

/** Dependency-free SVG bar chart (vertical or horizontal). Bars are focusable; details show below the plot. */
export function BarChart({ items, ariaLabel, orientation = 'v', noDataText }: BarChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(0, ...items.map((i) => i.value ?? 0));
  const scale = max > 0 ? max : 1;
  const horizontal = orientation === 'h';
  const rowH = 30;
  const H = horizontal ? items.length * rowH + 8 : 220;
  const left = horizontal ? 150 : 8;
  const plotW = horizontal ? W - left - 90 : W - 16;
  const plotH = 170;
  const slot = horizontal ? 0 : plotW / Math.max(1, items.length);
  const current = active !== null ? items[active] : null;

  return (
    <div className="an-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label={ariaLabel} className={`an-chart__svg${horizontal ? ' an-chart__svg--h' : ''}`}>
        {horizontal ? items.map((item, i) => {
          const w = item.value === null ? 0 : Math.max(2, (item.value / scale) * plotW);
          return (
            <g key={item.key} tabIndex={0} role="img" aria-label={`${item.label}: ${item.valueText}`}
              className={`an-bar${active === i ? ' is-active' : ''}`}
              onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onMouseLeave={() => setActive(null)} onBlur={() => setActive(null)}>
              <title>{`${item.label}: ${item.valueText}`}</title>
              <rect x={0} y={i * rowH} width={W} height={rowH} fill="transparent" />
              <text x={left - 8} y={i * rowH + 19} textAnchor="end" className="an-chart__label">{item.label.length > 22 ? `${item.label.slice(0, 21)}…` : item.label}</text>
              {item.value === null ? <text x={left} y={i * rowH + 19} className="an-chart__label">{noDataText}</text> : <rect x={left} y={i * rowH + 5} width={w} height={rowH - 10} fill={item.color ?? 'var(--moss)'} />}
              <text x={left + w + 6} y={i * rowH + 19} className="an-chart__value">{item.value === null ? '' : item.valueText}</text>
            </g>
          );
        }) : (
          <>
            <line x1={4} x2={W - 4} y1={plotH + 10} y2={plotH + 10} className="an-chart__axis" />
            {items.map((item, i) => {
              const x = 8 + i * slot;
              const bw = Math.min(64, slot * 0.6);
              const h = item.value === null ? 0 : Math.max(2, (item.value / scale) * (plotH - 20));
              const cx = x + slot / 2;
              return (
                <g key={item.key} tabIndex={0} role="img" aria-label={`${item.label}: ${item.value === null ? noDataText : item.valueText}`}
                  className={`an-bar${active === i ? ' is-active' : ''}`}
                  onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onMouseLeave={() => setActive(null)} onBlur={() => setActive(null)}>
                  <title>{`${item.label}: ${item.value === null ? noDataText : item.valueText}`}</title>
                  <rect x={x} y={0} width={slot} height={H} fill="transparent" />
                  {item.value === null
                    ? <text x={cx} y={plotH - 6} textAnchor="middle" className="an-chart__label">{noDataText}</text>
                    : <rect x={cx - bw / 2} y={plotH + 10 - h} width={bw} height={h} fill={item.color ?? 'var(--moss)'} stroke={item.highlight ? 'var(--forest)' : 'none'} strokeWidth={2} />}
                  <text x={cx} y={plotH + 10 - h - 6} textAnchor="middle" className="an-chart__value">{item.value === null ? '' : item.valueText}</text>
                  <text x={cx} y={plotH + 30} textAnchor="middle" className="an-chart__label">{item.label}</text>
                </g>
              );
            })}
          </>
        )}
      </svg>
      <div className="an-tip" aria-live="polite">
        {current ? (
          <>
            <strong>{current.label}</strong>
            {current.tip.map((line, i) => <span key={i}>{line}</span>)}
          </>
        ) : null}
      </div>
    </div>
  );
}
