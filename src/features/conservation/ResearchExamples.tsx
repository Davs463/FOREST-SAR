import { History, Telescope } from 'lucide-react';
import type { SourceId } from './conservation.data';
import { Cite, useConservation } from './shared';

const SOURCES: SourceId[][] = [['jpl2023', 'jplcaltech2023'], ['jpl2017b'], ['jpl2017c'], ['jpl2017d'], ['saatchi2007', 'jpl2017a', 'jpl2023']];

/** Earlier-mission case studies. The last card also states a planned NISAR capability, labelled as such. */
export function ResearchExamples() {
  const { c } = useConservation();
  const r = c.research;
  return (
    <div className="cons-research" data-testid="cons-research">
      <h3 className="cons-subtitle">{r.title}</h3>
      <p className="cons-lede">{r.lede}</p>
      <ul>
        {r.items.map((item, i) => (
          <li key={item.title}>
            <span className="cons-chip cons-chip--dark"><History size={12} aria-hidden="true" />{r.earlier}</span>
            {i === r.items.length - 1 && <span className="cons-chip cons-chip--plan"><Telescope size={12} aria-hidden="true" />{r.planned}</span>}
            <h4>{item.title}</h4>
            <p className="cons-research__mission mono">{item.mission}</p>
            <p>{item.text}</p>
            <Cite ids={SOURCES[i]} />
          </li>
        ))}
      </ul>
    </div>
  );
}
