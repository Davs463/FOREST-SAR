import { useState } from 'react';
import { ArrowRight, Bird, Building2, CloudRain, Factory, Flame, Info, Puzzle, ShieldAlert, Tractor } from 'lucide-react';
import { Modal } from '../../components';
import type { ImageId, SourceId } from './conservation.data';
import { sectionDomId } from './sectionNav';
import { Cite, Photo, SectionHead, useConservation } from './shared';

type ThreatId = 'agriculture' | 'urban' | 'fire' | 'fragmentation';
const THREATS: { id: ThreatId; icon: typeof Flame; image: ImageId; sources: SourceId[]; representative: boolean }[] = [
  { id: 'agriculture', icon: Tractor, image: 'agriculture', sources: ['natgeo2024'], representative: true },
  { id: 'urban', icon: Building2, image: 'urban', sources: ['ortiz2022', 'tigraPlan'], representative: false },
  { id: 'fire', icon: Flame, image: 'fire', sources: ['aquae'], representative: false },
  { id: 'fragmentation', icon: Puzzle, image: 'fragmentation', sources: ['jpl2017b'], representative: false },
];

type ConsequenceId = 'biodiversity' | 'emissions' | 'water' | 'disasters';
const CONSEQUENCES: { id: ConsequenceId; icon: typeof Flame; sources: SourceId[] }[] = [
  { id: 'biodiversity', icon: Bird, sources: ['bbva2026', 'jpl2017b'] },
  { id: 'emissions', icon: Factory, sources: ['bbva2026', 'jpl2023'] },
  { id: 'water', icon: CloudRain, sources: ['bbva2026', 'jpl2017b'] },
  { id: 'disasters', icon: ShieldAlert, sources: ['bbva2026', 'jpl2017c'] },
];

export function EnvironmentalThreats() {
  const { c } = useConservation();
  const th = c.threats;
  const [open, setOpen] = useState<ThreatId | null>(null);
  const current = THREATS.find((x) => x.id === open) ?? null;

  return (
    <section className="cons-section" id={sectionDomId('threats')} aria-labelledby="cons-threats-title" data-reveal>
      <SectionHead id="cons-threats-title" kicker={th.kicker} title={th.title} lede={th.lede} />
      <p className="cons-disclaimer" data-testid="cons-cause-disclaimer"><Info size={16} aria-hidden="true" />{th.disclaimer}</p>

      <ul className="cons-threats" data-testid="threat-cards">
        {THREATS.map(({ id, icon: Icon, image, sources, representative }) => {
          const tx = th.items[id];
          return (
            <li key={id} className="cons-threat">
              <Photo id={image} caption={tx.photo} representative={representative} />
              <div className="cons-threat__body">
                <span className="cons-threat__icon"><Icon size={20} aria-hidden="true" /></span>
                <h3>{tx.title}</h3>
                <p>{tx.summary}</p>
                <Cite ids={sources} />
                <button type="button" className="cons-more" onClick={() => setOpen(id)} data-testid={`threat-more-${id}`}>
                  {c.readMore}<ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <Modal open={current !== null} title={current ? th.items[current.id].title : ''} closeLabel={c.close} onClose={() => setOpen(null)}>
        {current && (
          <div className="cons-modal" data-testid="threat-modal">
            {th.items[current.id].detail.map((para) => <p key={para}>{para}</p>)}
            <Cite inert ids={current.sources} />
            <p className="cons-differ-note"><Info size={14} aria-hidden="true" /><span>{th.disclaimer}</span></p>
          </div>
        )}
      </Modal>

      <h3 className="cons-subtitle">{th.consequencesTitle}</h3>
      <ul className="cons-consequences" data-testid="consequences">
        {CONSEQUENCES.map(({ id, icon: Icon, sources }) => {
          const tx = th.consequences[id];
          return (
            <li key={id}>
              <span className="cons-consequence__icon"><Icon size={22} aria-hidden="true" /></span>
              <h4>{tx.title}</h4>
              <p>{tx.text}</p>
              <p className="cons-daily">{tx.daily}</p>
              <Cite ids={sources} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
