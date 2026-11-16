import { Check, Eye, Flame, Megaphone, Plus, ScanSearch, Sprout, TriangleAlert, Users } from 'lucide-react';
import { ROLE_IDS, type RoleId } from './conservation.data';
import { useConservation } from './shared';

const ICONS: Record<RoleId, typeof Eye> = {
  observer: Eye, analyst: ScanSearch, liaison: Users, brigade: Flame, communications: Megaphone, volunteer: Sprout,
};

/** Multi-select role cards (toggle buttons with aria-pressed). */
export function ParticipationRoles({ selected, onToggle }: { selected: ReadonlySet<RoleId>; onToggle: (id: RoleId) => void }) {
  const { c } = useConservation();
  const inv = c.involved;
  return (
    <ul className="cons-roles" data-testid="cons-roles">
      {ROLE_IDS.map((id) => {
        const Icon = ICONS[id];
        const role = inv.roles[id];
        const on = selected.has(id);
        return (
          <li key={id} className={`cons-role${on ? ' is-selected' : ''}`}>
            <span className="cons-role__icon"><Icon size={22} aria-hidden="true" /></span>
            <h3>{role.title}</h3>
            <p>{role.text}</p>
            {'safety' in role && <p className="cons-role__safety"><TriangleAlert size={14} aria-hidden="true" />{role.safety}</p>}
            <button type="button" className="cons-role__btn" aria-pressed={on} onClick={() => onToggle(id)} data-testid={`role-${id}`}>
              {on ? <Check size={15} aria-hidden="true" /> : <Plus size={15} aria-hidden="true" />}
              {on ? inv.selected : inv.select}
              <span className="visually-hidden">: {role.title}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
