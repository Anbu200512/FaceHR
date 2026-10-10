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

    run();
    timer = setInterval(run, interval);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [active, interval]);

  return { data, loading, error, refetch: async () => fnRef.current().then(setData).catch(setError) };
}