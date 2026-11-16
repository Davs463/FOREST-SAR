import { Bird, Droplets, HandHeart, Leaf, Mountain, ShieldCheck, Wind } from 'lucide-react';
import type { SourceId } from './conservation.data';
import { sectionDomId } from './sectionNav';
import { Cite, Photo, SectionHead, useConservation } from './shared';

const ICONS = [Wind, Droplets, Bird, Mountain, Leaf, HandHeart, ShieldCheck] as const;
const SOURCES: SourceId[][] = [['jpl2017a'], ['jpl2017a', 'jpl2017b'], ['jpl2017a', 'jpl2017b'], ['jpl2017b'], ['fao'], ['jpl2017b'], ['fao']];

export function ConservationBenefits() {
  const { c } = useConservation();
  const b = c.benefits;
  return (
    <section className="cons-section cons-section--band" id={sectionDomId('benefits')} aria-labelledby="cons-benefits-title" data-reveal>
      <div className="cons-benefits">
        <div>
          <SectionHead id="cons-benefits-title" kicker={b.kicker} title={b.title} lede={b.lede} />
          <ul className="cons-benefits__grid" data-testid="benefits">
            {b.items.map((item, i) => {
              const Icon = ICONS[i];
              return (
                <li key={item.title}>
                  <Icon size={20} aria-hidden="true" />
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <Cite ids={SOURCES[i]} />
                </li>
              );
            })}
          </ul>
        </div>
        <aside className="cons-benefits__aside">
          <Photo id="tigraWater" caption={b.photo} />
          <div className="cons-monitor">
            <h3>{b.monitoringTitle}</h3>
            <p>{b.monitoring}</p>
            <Cite ids={['jpl2017a']} />
          </div>
        </aside>
      </div>
    </section>
  );
}
