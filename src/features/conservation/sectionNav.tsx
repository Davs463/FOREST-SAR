import { useEffect, useState } from 'react';
import { SECTION_IDS, type SectionId } from './conservation.data';
import { useConservation } from './shared';

export const sectionDomId = (id: SectionId) => `cons-${id}`;

/** In-page navigation without touching the hash (the app uses hash routing: #/conservation). */
export function scrollToSection(id: SectionId) {
  const target = document.getElementById(sectionDomId(id));
  if (!target) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  target.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
}

export function SectionNav() {
  const { c } = useConservation();
  const [active, setActive] = useState<SectionId | null>(null);

  // Active section = last one whose top has passed 35 % of the viewport (none above the first section).
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.35;
      let current: SectionId | null = null;
      for (const id of SECTION_IDS) {
        const el = document.getElementById(sectionDomId(id));
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (frame) window.cancelAnimationFrame(frame); };
  }, []);

  return (
    <nav className="cons-nav" aria-label={c.sectionNav} data-testid="cons-section-nav">
      <ol>
        {SECTION_IDS.map((id, i) => (
          <li key={id}>
            <button type="button" aria-current={active === id ? 'true' : undefined} className={active === id ? 'is-active' : undefined} onClick={() => scrollToSection(id)}>
              <span className="mono">{String(i + 1).padStart(2, '0')}</span>{c.nav[id]}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
