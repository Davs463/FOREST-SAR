import { useRef, type KeyboardEvent } from 'react';

export interface TabItem {
  id: string;
  label: string;
  disabled?: boolean;
  title?: string;
}

interface TabsProps {
  idPrefix: string;
  tabs: readonly TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  label: string;
}

export const tabDomId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const panelDomId = (prefix: string) => `${prefix}-panel`;

/** Tablist with roving tabindex and arrow-key navigation. The consumer renders the single tabpanel. */
export function Tabs({ idPrefix, tabs, activeId, onChange, label }: TabsProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const enabled = tabs.filter((tab) => !tab.disabled);

  const focusableId = enabled.some((tab) => tab.id === activeId) ? activeId : enabled[0]?.id ?? null;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (enabled.length === 0) return;
    const index = Math.max(0, enabled.findIndex((tab) => tab.id === focusableId));
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % enabled.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + enabled.length) % enabled.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = enabled.length - 1;
    else return;
    event.preventDefault();
    const target = enabled[next];
    if (!target) return;
    onChange(target.id);
    refs.current[target.id]?.focus();
  }

  return (
    <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          ref={(node) => { refs.current[tab.id] = node; }}
          id={tabDomId(idPrefix, tab.id)}
          type="button"
          role="tab"
          className="tabs__tab"
          aria-selected={tab.id === activeId}
          aria-controls={panelDomId(idPrefix)}
          tabIndex={tab.id === focusableId ? 0 : -1}
          disabled={tab.disabled}
          title={tab.title}
          onClick={() => onChange(tab.id)}
        >{tab.label}</button>
      ))}
    </div>
  );
}
