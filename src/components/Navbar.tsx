import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';

export interface NavItem {
  id: string;
  href: string;
  label: string;
}

interface NavbarProps {
  brandName: string;
  homeHref: string;
  homeLabel: string;
  items: readonly NavItem[];
  activeId: string | null;
  navLabel: string;
  openLabel: string;
  closeLabel: string;
  actions?: ReactNode;
}

export function BrandMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 40 40" className="brand-mark">
      <path d="M20 2 36 11v18L20 38 4 29V11L20 2Z" fill="currentColor" />
      <path d="M19 31c-5-8-3-15 5-22 0 5 2 8 6 10-5 1-8 4-11 12Z" fill="#a3d977" />
      <path d="M15 28c1-5 4-9 10-12" fill="none" stroke="#102820" strokeWidth="1.5" />
    </svg>
  );
}

export function Navbar({ brandName, homeHref, homeLabel, items, activeId, navLabel, openLabel, closeLabel, actions }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className="site-header">
      <a className="brand" href={homeHref} aria-label={`${brandName} — ${homeLabel}`}>
        <BrandMark />
        <span>{brandName}</span>
      </a>
      <nav id="site-nav" className={`site-nav${open ? ' is-open' : ''}`} aria-label={navLabel}>
        {items.map((item) => (
          <a
            key={item.id}
            href={item.href}
            aria-current={item.id === activeId ? 'page' : undefined}
            className={item.id === activeId ? 'is-active' : undefined}
            onClick={() => setOpen(false)}
          >{item.label}</a>
        ))}
      </nav>
      <div className="header-action">{actions}</div>
      <button
        ref={toggleRef}
        className="menu-toggle"
        type="button"
        aria-label={open ? closeLabel : openLabel}
        aria-expanded={open}
        aria-controls="site-nav"
        onClick={() => setOpen((value) => !value)}
      >{open ? <X /> : <Menu />}</button>
    </header>
  );
}
