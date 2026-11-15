import { useCallback } from 'react';
import { useHashParam } from '../../app/router';

export interface AnalyticsParams { compare: string | null; zone: string | null; place: string | null }
type Patch = Partial<Record<keyof AnalyticsParams, string | null>>;

/** `?compare=&zone=&place=` of the hash, kept in sync without adding history entries. */
export function useAnalyticsParams(): AnalyticsParams & { update: (patch: Patch) => void } {
  const compare = useHashParam('compare');
  const zone = useHashParam('zone');
  const place = useHashParam('place');

  const update = useCallback((patch: Patch) => {
    const [path, query = ''] = window.location.hash.split('?');
    const params = new URLSearchParams(query);
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value); else params.delete(key);
    }
    const qs = params.toString();
    const next = `${path || '#/analytics'}${qs ? `?${qs}` : ''}`;
    window.history.replaceState(null, '', next);
    // replaceState does not fire hashchange: notify useHashParam listeners.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, []);

  return { compare, zone, place, update };
}
