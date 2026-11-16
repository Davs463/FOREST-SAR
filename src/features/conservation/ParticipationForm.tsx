import { useId, useState, type FormEvent } from 'react';
import { ArrowRight, FlaskConical, ShieldCheck, Users } from 'lucide-react';
import { Button } from '../../components';
import { routeHref } from '../../config/app.config';
import { MUNICIPALITIES, ROLE_IDS, type RoleId } from './conservation.data';
import { useConservation } from './shared';

type Contact = '' | 'phone' | 'email' | 'any';

/**
 * Demonstration flow only. It never asks for a name, phone or e-mail, sends nothing over the network
 * and stores nothing (no localStorage): the preview lives in component state and disappears on reload.
 */
export function ParticipationForm({ selected, onReset }: { selected: ReadonlySet<RoleId>; onReset: () => void }) {
  const { c } = useConservation();
  const inv = c.involved;
  const ids = useId();
  const [municipality, setMunicipality] = useState('');
  const [contact, setContact] = useState<Contact>('');
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState(false);
  const roles = ROLE_IDS.filter((id) => selected.has(id));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (roles.length === 0) { setError(true); setPreview(false); return; }
    setError(false);
    setPreview(true);
  };
  const reset = () => { setMunicipality(''); setContact(''); setPreview(false); setError(false); onReset(); };
  const contactLabel = { '': inv.notChosen, phone: inv.contactPhone, email: inv.contactEmail, any: inv.contactAny }[contact];

  return (
    <div className="cons-form-wrap" data-testid="cons-form">
      <form className="cons-form" onSubmit={submit} noValidate>
        <h3>{inv.formTitle}</h3>
        <p className="cons-demo" role="note" data-testid="cons-demo-banner"><FlaskConical size={16} aria-hidden="true" /><span><strong>{inv.demo}</strong> {inv.demoHint}</span></p>

        <fieldset>
          <legend>{inv.rolesLabel}</legend>
          {roles.length === 0
            ? <p className="cons-muted">{inv.noRoles}</p>
            : <ul className="cons-form__chips">{roles.map((id) => <li key={id} className="cons-chip">{inv.roles[id].title}</li>)}</ul>}
        </fieldset>

        <label htmlFor={`${ids}-muni`}>{inv.municipalityLabel}</label>
        <select id={`${ids}-muni`} value={municipality} onChange={(e) => setMunicipality(e.target.value)} data-testid="cons-municipality">
          <option value="">{inv.municipalityPlaceholder}</option>
          {MUNICIPALITIES.map((m) => <option key={m} value={m}>{m}</option>)}
          <option value="other">{inv.otherMunicipality}</option>
        </select>

        <fieldset>
          <legend>{inv.contactLabel}</legend>
          <div className="cons-radios">
            {(['phone', 'email', 'any'] as const).map((value) => (
              <label key={value}><input type="radio" name={`${ids}-contact`} value={value} checked={contact === value} onChange={() => setContact(value)} />{{ phone: inv.contactPhone, email: inv.contactEmail, any: inv.contactAny }[value]}</label>
            ))}
          </div>
        </fieldset>
        <p className="cons-note"><ShieldCheck size={14} aria-hidden="true" /> {inv.plannedUse}</p>

        {error && <p className="cons-error" role="alert">{inv.needRole}</p>}
        <div className="cons-form__actions">
          <Button type="submit" variant="primary" icon={<ArrowRight size={16} aria-hidden="true" />} data-testid="cons-preview">{inv.submit}</Button>
          <Button variant="ghost" onClick={reset}>{inv.reset}</Button>
        </div>
      </form>

      <div className="cons-form__side" aria-live="polite">
        {preview ? (
          <div className="cons-summary" data-testid="cons-summary">
            <h3>{inv.summaryTitle}</h3>
            <dl>
              <div><dt>{inv.summaryRoles}</dt><dd>{roles.map((id) => inv.roles[id].title).join(', ')}</dd></div>
              <div><dt>{inv.summaryMunicipality}</dt><dd>{municipality === 'other' ? inv.otherMunicipality : municipality || inv.notChosen}</dd></div>
              <div><dt>{inv.summaryContact}</dt><dd>{contactLabel}</dd></div>
            </dl>
            <p className="cons-summary__note"><ShieldCheck size={15} aria-hidden="true" />{inv.summaryNothingSent}</p>
          </div>
        ) : (
          <div className="cons-summary cons-summary--idle" aria-hidden="true"><Users size={40} /></div>
        )}
        <Button variant="secondary" href={routeHref('community')} icon={<ArrowRight size={16} aria-hidden="true" />} data-testid="cons-to-community">{inv.community}</Button>
      </div>
    </div>
  );
}
