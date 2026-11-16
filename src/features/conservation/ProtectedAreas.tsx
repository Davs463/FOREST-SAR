import { useState, type ReactNode } from 'react';
import { ArrowRight, Bird, Leaf, Mountain, Scale, TreePine } from 'lucide-react';
import { Modal } from '../../components';
import { MERO_SPLIT, type SourceId } from './conservation.data';
import { sectionDomId } from './sectionNav';
import { Cite, Photo, SectionHead, useConservation } from './shared';

type AreaId = 'tigra' | 'corralitos' | 'yerbaBuena' | 'mero';

const AREA_META: Record<AreaId, { icon: typeof TreePine; area: number | null; digits: number; sources: SourceId[] }> = {
  tigra: { icon: Mountain, area: null, digits: 0, sources: ['icf2021', 'sinit2024'] },
  corralitos: { icon: Bird, area: 3_827.74, digits: 2, sources: ['icf2021'] },
  yerbaBuena: { icon: Leaf, area: 189.01, digits: 2, sources: ['icf2021'] },
  mero: { icon: TreePine, area: 5_107, digits: 0, sources: ['brand2024'] },
};

/** Proportional split of the Mero refuge across municipalities (parts sum to the reported total). */
function MeroSplit() {
  const { c, num } = useConservation();
  const total = MERO_SPLIT.reduce((s, m) => s + m.ha, 0);
  return (
    <div className="cons-split" data-testid="mero-split">
      <p className="cons-split__title">{c.protected.mero.splitTitle}</p>
      <ul>
        {MERO_SPLIT.map((m) => (
          <li key={m.name}>
            <span className="cons-split__name">{m.name}</span>
            <span className="cons-split__track" aria-hidden="true"><span style={{ width: `${Math.max((m.ha / total) * 100, 0.6)}%` }} /></span>
            <span className="cons-split__value mono">{num(m.ha)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Placeholder({ icon: Icon, label }: { icon: typeof TreePine; label: string }) {
  return (
    <div className="cons-placeholder" role="img" aria-label={label}>
      <svg className="cons-placeholder__lines" viewBox="0 0 200 120" aria-hidden="true" preserveAspectRatio="none">
        {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M0 ${100 - i * 14} C 50 ${80 - i * 14}, 120 ${118 - i * 14}, 200 ${92 - i * 14}`} fill="none" stroke="currentColor" strokeOpacity=".22" />)}
      </svg>
      <Icon size={30} aria-hidden="true" style={{ position: 'relative' }} />
      <span>{label}</span>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return <section className="cons-modal__block"><h3>{title}</h3>{children}</section>;
}

export function ProtectedAreas() {
  const { c, num } = useConservation();
  const p = c.protected;
  const [open, setOpen] = useState<AreaId | null>(null);
  const ids: AreaId[] = ['tigra', 'corralitos', 'yerbaBuena', 'mero'];
  const text = (id: AreaId) => p[id];

  const areaLabel = (id: AreaId) => {
    const meta = AREA_META[id];
    if (meta.area === null) return '';
    return `${num(meta.area, meta.digits)} ha`;
  };

  return (
    <section className="cons-section" id={sectionDomId('protected')} aria-labelledby="cons-protected-title" data-reveal>
      <SectionHead id="cons-protected-title" kicker={p.kicker} title={p.title} lede={p.lede} />
      <ul className="cons-areas" data-testid="protected-areas">
        {ids.map((id) => {
          const meta = AREA_META[id];
          const tx = text(id);
          return (
            <li key={id} className={`cons-area cons-area--${id}`} data-testid={`area-${id}`}>
              {id === 'tigra' ? <Photo id="tigra" caption={p.tigra.photo} /> : <Placeholder icon={meta.icon} label={c.noPhoto} />}
              <div className="cons-area__body">
                <span className="cons-chip">{tx.category}</span>
                <h3>{tx.name}</h3>
                <p>{tx.summary}</p>
                <dl className="cons-area__facts">
                  <div><dt>{p.areaLabel}</dt><dd>{id === 'tigra' ? <span className="cons-differ"><Scale size={13} aria-hidden="true" />{c.sourcesDiffer}</span> : areaLabel(id)}</dd></div>
                  {id === 'mero' && <div><dt>{p.categoryLabel}</dt><dd>{p.mero.established}</dd></div>}
                </dl>
                <Cite ids={meta.sources} />
                <button type="button" className="cons-more" onClick={() => setOpen(id)} data-testid={`area-more-${id}`}>
                  {c.readMore}<ArrowRight size={14} aria-hidden="true" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="cons-note">{p.noMap}</p>

      <Modal open={open === 'tigra'} title={p.tigra.name} closeLabel={c.close} onClose={() => setOpen(null)}>
        <div className="cons-modal" data-testid="tigra-modal">
          <p><span className="cons-chip">{p.tigra.category}</span></p>
          <p>{p.tigra.territory} <Cite inert ids={['sinit2024']} /></p>
          <Block title={p.tigra.areaTitle}>
            <div className="cons-compare">
              <div><strong>{num(17_657)} ha</strong><p>{p.tigra.areaA}</p><Cite inert ids={['icf2021']} /></div>
              <div><strong>~{num(24_000)} ha</strong><p>{p.tigra.areaB}</p><Cite inert ids={['sinit2024']} /></div>
            </div>
          </Block>
          <Block title={p.tigra.waterTitle}>
            <div className="cons-compare">
              <div><strong>~30 %</strong><p>{p.tigra.waterA}</p><Cite inert ids={['sinit2024']} /></div>
              <div><strong>40 %</strong><p>{p.tigra.waterB}</p><Cite inert ids={['tigraPlan']} /></div>
            </div>
            <p className="cons-differ-note" data-testid="tigra-discrepancy"><Scale size={14} aria-hidden="true" /><span><strong>{c.sourcesDiffer}.</strong> {p.tigra.discrepancy}</span></p>
            <p>{p.tigra.waterDetail} <Cite inert ids={['tigraPlan']} /></p>
          </Block>
          <Block title={p.tigra.biodiversityTitle}><p>{p.tigra.biodiversity} <Cite inert ids={['tigraPlan']} /></p></Block>
          <Block title={p.tigra.comanagementTitle}><p>{p.tigra.comanagement} <Cite inert ids={['icf2021']} /></p></Block>
          <Block title={p.tigra.pressuresTitle}><p>{p.tigra.pressures} <Cite inert ids={['tigraPlan']} /></p></Block>
        </div>
      </Modal>
      {(['corralitos', 'yerbaBuena'] as const).map((id) => (
        <Modal key={id} open={open === id} title={p[id].name} closeLabel={c.close} onClose={() => setOpen(null)}>
          <div className="cons-modal">
            <p><span className="cons-chip">{p[id].category}</span></p>
            <p className="cons-modal__figure"><strong>{areaLabel(id)}</strong> {p.areaLabel.toLowerCase()}</p>
            <p>{p[id].detail} <Cite inert ids={['icf2021']} /></p>
            <p className="cons-note">{p.noMap}</p>
          </div>
        </Modal>
      ))}
      <Modal open={open === 'mero'} title={p.mero.name} closeLabel={c.close} onClose={() => setOpen(null)}>
        <div className="cons-modal">
          <p><span className="cons-chip">{p.mero.category}</span> <span className="cons-chip cons-chip--soft">{p.mero.established}</span></p>
          <p className="cons-modal__figure"><strong>{num(5_107)} ha</strong> {p.areaLabel.toLowerCase()}</p>
          <p>{p.mero.detail} <Cite inert ids={['brand2024']} /></p>
          <MeroSplit />
          <p className="cons-note">{p.noMap}</p>
        </div>
      </Modal>
    </section>
  );
}
