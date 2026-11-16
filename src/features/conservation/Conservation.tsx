import { useCallback, useEffect, useState } from 'react';
import type { RoleId } from './conservation.data';
import { ConservationBenefits } from './ConservationBenefits';
import { ConservationHero } from './ConservationHero';
import { ConservationReferences } from './ConservationReferences';
import { EnvironmentalThreats } from './EnvironmentalThreats';
import { ForestStatistics } from './ForestStatistics';
import { ParticipationForm } from './ParticipationForm';
import { ParticipationRoles } from './ParticipationRoles';
import { ProtectedAreas } from './ProtectedAreas';
import { RegionalContext } from './RegionalContext';
import { SatelliteTechnology } from './SatelliteTechnology';
import { SectionNav, sectionDomId } from './sectionNav';
import { SectionHead, useConservation } from './shared';
import './conservation.css';

/** Forest & Conservation (#/conservation): educational context for the observatory. No scientific processing here. */
export default function Conservation() {
  const { c } = useConservation();
  const [roles, setRoles] = useState<ReadonlySet<RoleId>>(() => new Set());
  const toggleRole = useCallback((id: RoleId) => setRoles((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }), []);

  // Gentle reveal on scroll, skipped with reduced motion (same pattern as Methodology).
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
    }, { threshold: 0.05, rootMargin: '0px 0px -4% 0px' });
    document.querySelectorAll<HTMLElement>('.conservation [data-reveal]').forEach((el) => { el.classList.add('reveal-pending'); observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="conservation" data-testid="conservation-page">
      <ConservationHero />
      <SectionNav />
      <div className="cons-body">
        <ForestStatistics />
        <div className="cons-section-group">
          <ProtectedAreas />
          <RegionalContext />
        </div>
        <EnvironmentalThreats />
        <ConservationBenefits />
        <SatelliteTechnology />
        <section className="cons-section cons-involved" id={sectionDomId('involved')} aria-labelledby="cons-involved-title" data-reveal>
          <SectionHead id="cons-involved-title" kicker={c.involved.kicker} title={c.involved.title} lede={c.involved.lede} />
          <ParticipationRoles selected={roles} onToggle={toggleRole} />
          <ParticipationForm selected={roles} onReset={() => setRoles(new Set())} />
        </section>
        <ConservationReferences />
      </div>
    </div>
  );
}
