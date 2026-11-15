import { useEffect, useState } from 'react';
import { enabledRoutes, type RouteDef } from '../config/app.config';

// Hash router: `#/observatory`. Native history gives a correct Back button and works on static hosting.

function currentPath(): string {
  const raw = window.location.hash.replace(/^#/, '');
  const path = raw.split('?')[0];
  return path === '' ? '/' : path.startsWith('/') ? path.replace(/\/+$/, '') || '/' : '/__not_found__';
}

export function useRoute(): { path: string; route: RouteDef | null } {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onChange = () => setPath(currentPath());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return { path, route: enabledRoutes.find((item) => item.path === path) ?? null };
}

function hashParam(name: string): string | null {
  const query = window.location.hash.split('?')[1] ?? '';
  return new URLSearchParams(query).get(name);
}

/** Reads `?name=value` from the hash (e.g. `#/observatory?compare=abc`) and follows hash changes. */
export function useHashParam(name: string): string | null {
  const [value, setValue] = useState(() => hashParam(name));
  useEffect(() => {
    const onChange = () => setValue(hashParam(name));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, [name]);
  return value;
}
