import { useEffect, useState, useCallback } from 'react';

/**
 * Minimal data-fetching hook.
 * fn must be a stable reference or keyed by `deps`.
 */
export function useApi(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fn();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fn()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const refetch = useCallback(async () => {
    try {
      const result = await fn();
      setData(result);
      setError(null);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, refetch, fetchData };
}