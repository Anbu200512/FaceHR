import { useEffect, useRef, useState } from 'react';

export function useDebounce(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/** Polls a fetch function every `interval` ms while `active`. */
export function usePolling(fn, { interval = 30000, active = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fnRef = useRef(fn);
  fnRef.current = fn;

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const run = async () => {
      // Don't poll while the tab is in the background — saves server requests.
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const result = await fnRef.current();
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (!active) {
      setLoading(false);
      return () => { cancelled = true; if (timer) clearInterval(timer); };
    }

    const onVisible = () => {
      if (!document.hidden) run();
    };

    run();
    timer = setInterval(run, interval);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [active, interval]);

  return { data, loading, error, refetch: async () => fnRef.current().then(setData).catch(setError) };
}