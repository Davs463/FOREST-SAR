import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ScienceState } from '../shared/science.types';
import { loadScience } from './science.repository';

interface ScienceValue {
  state: ScienceState;
  reload: () => void;
}

const ScienceContext = createContext<ScienceValue | null>(null);

/** One fetch of the published snapshot shared by all routes; cancelled on unmount or reload. */
export function ScienceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ScienceState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    loadScience(controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setState(next);
      })
      .catch(() => {
        // Only aborts reach here (loadScience converts every other failure into a state).
      });
    return () => controller.abort();
  }, [attempt]);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  const value = useMemo(() => ({ state, reload }), [state, reload]);
  return <ScienceContext.Provider value={value}>{children}</ScienceContext.Provider>;
}

export function useScience(): ScienceValue {
  const value = useContext(ScienceContext);
  if (!value) throw new Error('useScience must be used inside ScienceProvider');
  return value;
}
